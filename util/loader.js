const { Collection, ChannelType } = require('discord.js');
const { readdirSync, cp } = require('fs');
const { RolesChannel, MsgHallHeros, MsgHallZeros, Msg, MsgDmdeAide, Game, GuildConfig } = require('../models');
const { loadJobs, searchNewGamesJob, resetMoneyLimit, loadJobHelper, loadEvent } = require('./batch/batch');
const { createReactionCollectorGroup, moveToArchive } = require('./msg/group');
const { Group } = require('../models/index');
const { CHANNEL, SALON } = require('./constants');
const { Logform } = require('winston');
const succes = require('../data/achievements.json');
const customItems = require('../data/customShop.json');
const { escapeRegExp } = require('./util');

const fs = require('node:fs');
const path = require('node:path');

// Charge les commandes
const loadCommands = (client, dir = "./slash_commands/") => {
    client.commands = new Collection();

    const commandsPath = path.join(__dirname, '../slash_commands/');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] Il manque "data" ou "execute" dans la commande ${filePath}.`);
            logger.warn(`[WARNING] Il manque "data" ou "execute" dans la commande ${filePath}.`)
        }
    }
};

const loadSlashCommands = async (client, dir = "./slash_commands/") => {
    client.slashCommands = new Collection();
    readdirSync(dir).forEach(dirs => {
        const commands = readdirSync(`${dir}/${dirs}/`).filter(files => files.endsWith(".js"));

        for (const file of commands) {
            const getFileName = require(`../${dir}/${dirs}/${file}`);
            client.slashCommands.set(getFileName.help.name, getFileName);
            logger.info("/" + getFileName.help.name + " chargé");
        };
    });

    // Add our slash commands
    const data = client.slashCommands.map(c => ({
        name: c.help.name,
        description: c.help.description,
        options: c.help.args,
        defaultPermission: (!c.help.userperms || c.help.userperms?.length == 0),
    }));
    // Update the current list of commands for all guild
    // pour chaque guild
    client.guilds.cache.forEach(async guild => {
        logger.info(`.. creation / command pour guild ${guild.name}..`);
        await guild.commands.set(data);
    
        // update permissions
        const restrictCmds = client.slashCommands.filter(c => c.help.userperms?.length > 0).map(c => {
            const roleIDs = guild.roles.cache.filter(r => r.permissions.has(c.help.userperms)).map(r => r.id);
            c.roleIDs = roleIDs;
            return c;
        });
        
        const fullPermissions = await guild.commands.cache.filter(c => restrictCmds.find(cmd => cmd.help.name === c.name)).map(c => {
            const cmd = restrictCmds.find(cmd => cmd.help.name === c.name);
    
            return {
                id: c.id,
                permissions: cmd.roleIDs.map(r => ({
                    id: r,
                    type: 'ROLE',
                    permission: true,
                })),
            };
        });

        // Update the permissions for these commands
        //await guild.commands.permissions.set({ fullPermissions });
        logger.info(`.. Permissions slash commands à jour pour guild ${guild.name} ! (${restrictCmds.length})`);
    });

}

// Charge les événements
const loadEvents = (client, dir = "./events/") => {
    readdirSync(dir).forEach(dirs => {
        const events = readdirSync(`${dir}/${dirs}/`).filter(files => files.endsWith(".js"));

        for (const event of events) {
            const evt = require(`../${dir}/${dirs}/${event}`);
            const evtName = event.split('.')[0];
            client.on(evtName, evt.bind(null, client));
            logger.info("Évènement chargé " + evtName);
        };
    });
};

// Charge les 'batch'
const loadBatch = async (client) => {
    // TODO utiliser dir comme pour les autres load ?
    loadJobs(client);

    searchNewGamesJob(client);

    resetMoneyLimit();

    loadJobHelper(client);

    loadEvent(client);
}

// Charge les réactions des messages des groupes
const loadReactionGroup = async (client) => {
    const lMsgGrp = await MsgDmdeAide.find();
    
    // recupere TOUS les messages du channel de listage des groupes
    for (const msgDB of lMsgGrp) {
        const idListGroup = await client.getGuildChannel(msgDB.guildId, SALON.LIST_GROUP);

        if (idListGroup) {
            // recup msg sur bon channel
            client.channels.cache.get(idListGroup).messages.fetch(msgDB.msgId)
            .then(async msg => {
                const grp = await Group.findOne({ idMsg: msg.id });
                // filtre group encore en cours
                if (!grp.validated)
                    await createReactionCollectorGroup(client, msg, grp);
                else
                    await moveToArchive(client, idListGroup, grp.idMsg)
            }).catch(async err => {
                logger.error(`Erreur load listener reaction groupes ${err}, suppression msg`);
                // on supprime les msg qui n'existent plus
                await Msg.deleteOne({ _id: msgDB._id });
            })
        } else {
            logger.error('- Config salon msg groupe non défini !')
        }
    }
}

const loadReactionMsg = async (client) => {
    const lMsgHeros = await MsgHallHeros.find();
    const lMsgZeros = await MsgHallZeros.find();
    // merge les 2 array
    const lMsg = [...lMsgHeros, ...lMsgZeros]

    for (const msgDB of lMsg) {
        const idHeros = await client.getGuildChannel(msgDB.guildId, SALON.HALL_HEROS);
        const idZeros = await client.getGuildChannel(msgDB.guildId, SALON.HALL_ZEROS);

        if (idHeros && idZeros) {
            // recup msg sur bon channel
            const channelHall = msgDB.msgType === 'MsgHallHeros' ? idHeros : idZeros;
            client.channels.cache.get(channelHall).messages.fetch(msgDB.msgId)
            .catch(async err => {
                // on supprime les msg qui n'existent plus
                await Msg.deleteOne({ _id: msgDB._id });
            });
        } else {
            logger.error('- Config salons héros & zéros non définis !')
        }
    }
}

// Créé ou charge les reactions sur le message donnant les rôles
const loadRoleGiver = async (client, refresh = false, emojiDeleted) => {
    // TODO cooldown
    // pour chaque guild
    client.guilds.cache.forEach(async guild => {
        const idRole = await client.getGuildChannel(guild.id, SALON.ROLE);
        if (!idRole) {
            logger.error('- Config salon rôle non défini !')
            return;
        }
        // recupere le channel, et l'unique message dedans (normalement)
        const roleChannel = await guild.channels.fetch(idRole);

        if (!roleChannel) {
            logger.error(`Le channel de rôle n'existe pas ! ID ${idRole}`);
            return;
        }
        const msgs = await roleChannel.messages.fetch({ limit: 1 });

        // si le message n'existe pas, le créer
        let msg;
        let content = `Sélectionne le rôle que tu souhaites afin d'accéder aux salons liés à ces jeux !\n`;
        // recup dans bdd
        let roles = await RolesChannel.find({});

        content += roles.map((item) => { return item.emoji + " : \`" + item.name + "\`" }).join("\n")
        
        if (msgs.size === 0) {
            logger.warn(`Le message des rôles n'existe pas ! Création de celui-ci...`);
            
            msg = await roleChannel.send({ content: content });
        } else if (msgs.size === 1 && msgs.first().author.bot) {
            logger.warn(`Le message des rôles existe ! Maj de celui-ci...`);
            // un seul, et celui du bot, on maj (?)
            msg = await msgs.first().edit({ content: content })
            // TODO quid des réactions ?
        }

        // si refresh, on "ghost" message afin de montrer qu'il y a du nouveau
        if (refresh) {
            const msgToDelete = await roleChannel.send({ content: 'Mise à jour...' });
            await msgToDelete.delete();
        }

        // ajout réactions, au cas où nouvel emoji
        roles.forEach(async item => {
            // custom emoji
            if (item.emoji.startsWith("<")) {
                // regex emoji custom
                const matches = item.emoji.match(/(<a?)?:\w+:((\d{18})>)?/)
                if (matches)
                    await msg.react(client.emojis.cache.get(matches[3]));
            }
            else
                await msg.react(item.emoji);
        })

        // on enleve tous les émojis (dans le cas ou il y a eu un delete)
        if (emojiDeleted) {
            // recupere array des keys = emojis des reactions
            let keys = [ ...msg.reactions.cache.keys()]
            
            // recupere l'id de l'emoji custom deleted
            if (emojiDeleted.startsWith("<")) {
                const matches = emojiDeleted.match(/(<a?)?:\w+:((\d{18})>)?/) 
                emojiDeleted = matches[3]
            }

            const reactionsToDelete = keys.filter(x => x === emojiDeleted);

            // et on supprime ces réactions !
            reactionsToDelete.forEach(async element => {
                logger.info(`.. suppression des réactions ${element}`)
                await msg.reactions.cache.get(element).remove();
            });
        }

        // sinon collector sur reactions une seule fois, pour eviter X reactions
        if (!refresh) {
            const collector = await msg.createReactionCollector({ dispose: true });
            // ajout rôle
            collector.on('collect', async (r, u) => {
                if (!u.bot) {
                    // refresh roles
                    roles = await RolesChannel.find({});
                    // unicode ou custom
                    const item = roles.find(item => item.emoji === r.emoji.name || item.emoji.includes(r.emoji.identifier))
                    if (item?.roleID) {
                        // recup role
                        const role = await guild.roles.fetch(item.roleID);

                        if (role) {
                            // recup membre qui a cliqué
                            const member = await guild.members.fetch(u.id);
                            logger.info(`${u.tag} s'est ajouté le rôle ${role.name}`);
                            member.roles.add(role);
                        }
                    }
                }
            });
            // suppression rôle
            collector.on('remove', async (r, u) => {
                if (!u.bot) {
                    // referesh role
                    roles = await RolesChannel.find({});
                    // unicode ou custom
                    const item = roles.find(item => item.emoji === r.emoji.name || item.emoji.includes(r.emoji.identifier))
                    if (item?.roleID) {
                        // recup role
                        const role = await guild.roles.fetch(item.roleID);

                        if (role) {
                            // recup membre qui a cliqué
                            const member = await guild.members.fetch(u.id);
                            logger.info(`${u.tag} s'est retiré le rôle ${role.name}`);
                            member.roles.remove(role);
                        }
                    }
                }
            });
        }  
    })
}

const loadVocalCreator = async (client) => {
    
    // pour chaque guild, on check si le vocal "créer un chan vocal" est présent
    client.guilds.cache.forEach(async guild => {
        // si le chan vocal n'existe pas, on le créé + save
        let config = await GuildConfig.findOne({ guildId: guild.id })

        if (!config.channels || !config.channels['create_vocal']) {
            // créer un voice channel
            // TODO parent ?
            const voiceChannel = await guild.channels.create({
                name: '🔧 Créer un salon vocal', 
                type: ChannelType.GuildVoice
            });

            await GuildConfig.updateOne(
                { guildId: guild.id },
                { $set: { ["channels.create_vocal"] : voiceChannel.id } }
            );

            logger.warn(`.. salon vocal 'créateur' créé`)
        } else {
            // TODO test si le salon existe bien
            // s'il n'existe pas, on supprime la valeur dans la bdd
        }
    });
}

module.exports = {
    loadCommands,
    loadEvents,
    loadBatch,
    loadReactionGroup,
    loadSlashCommands,
    loadRoleGiver,
    loadReactionMsg,
    loadVocalCreator,
}
