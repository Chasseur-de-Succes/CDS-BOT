const { DiscordAPIError, Collection } = require('discord.js');
const { readdirSync } = require('fs');
const { CHANNEL, GUILD_ID, MONEY } = require('../config');
const { RolesChannel, MsgHallHeros, MsgHallZeros, Msg, MsgDmdeAide } = require('../models');
const { loadJobs, searchNewGamesJob } = require('./batch/batch');
const { createReactionCollectorGroup } = require('./msg/group');
const { Group } = require('../models/index');
const { loadCollectorHall } = require('./msg/stats');

// Charge les commandes
const loadCommands = (client, dir = "./commands/") => {
    readdirSync(dir).forEach(dirs => {
        const commands = readdirSync(`${dir}/${dirs}/`).filter(files => files.endsWith(".js"));

        for (const file of commands) {
            const getFileName = require(`../${dir}/${dirs}/${file}`);
            client.commands.set(getFileName.help.name, getFileName);
            logger.info("Commande chargée " + getFileName.help.name);
        };
    });
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
    // Update the current list of commands for this guild
    const guild = await client.guilds.fetch(GUILD_ID);
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
    await guild.commands.permissions.set({ fullPermissions });
    logger.info(`-- Permissions slash commands à jour ! (${restrictCmds.length})`);
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

    // TODO a revoir
    client.on('interactionCreate', async itr => {
        if (!itr.isAutocomplete()) return;
        // TODO mettre dans fichier js

        if (itr.commandName === 'adminshop') {
            // cmd adminshop delete, autocomplete sur nom jeu
            const focusedValue = itr.options.getFocused(true);
            const vendeurId = itr.options.get('vendeur')?.value;

            let filtered = [];
            
            if (focusedValue.name === 'jeu')
                filtered = await client.findGameItemShopBy({ game: focusedValue.value, seller: vendeurId, notSold: true });

            await itr.respond(
                filtered.map(choice => ({ name: choice.game.name, value: choice._id })),
            );
        } else if (itr.commandName === 'group') {
            const focusedValue = itr.options.getFocused(true);
            let filtered = [];
            
            // cmd group create, autocomplete sur nom jeu multi/coop avec succès
            if (focusedValue.name === 'jeu')
                filtered = await client.findGames({
                    name: new RegExp(focusedValue.value, "i"), 
                    hasAchievements: true,
                    $or: [{isMulti: true}, {isCoop: true}],
                });

            // autocomplete sur nom groupe
            if (focusedValue.name === 'nom') {
                filtered = await Group.find({
                    $and: [
                        { validated: false },
                        { name: new RegExp(focusedValue.value, 'i') }
                    ]
                })
            }

            if (filtered.length <= 25) {
                await itr.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.name })),
                );
            } else {
                await itr.respond([])
            }
        }
    })
};

// Charge les 'batch'
const loadBatch = async (client) => {
    // TODO utiliser dir comme pour les autres load ?
    loadJobs(client);

    searchNewGamesJob(client);
}

// Charge les réactions des messages des groupes
const loadReactionGroup = async (client) => {
    const lMsgGrp = await MsgDmdeAide.find();

    // recupere TOUS les messages du channel de listage des groupes
    for (const msgDB of lMsgGrp) {
        // recup msg sur bon channel
        client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch(msgDB.msgId)
        .then(async msg => {
            const grp = await Group.findOne({ idMsg: msg.id });
            // filtre group encore en cours
            if (!grp.validated)
                await createReactionCollectorGroup(client, msg, grp);
        }).catch(async err => {
            logger.error(`Erreur load listener reaction groupes ${err}, suppression msg`);
            // on supprime les msg qui n'existent plus
            await Msg.deleteOne({ _id: msgDB._id });
        })
    }
}

const loadReactionMsg = async (client) => {
    const lMsgHeros = await MsgHallHeros.find();
    const lMsgZeros = await MsgHallZeros.find();
    // merge les 2 array
    const lMsg = [...lMsgHeros, ...lMsgZeros]

    for (const msgDB of lMsg) {
        // recup msg sur bon channel
        const channelHall = msgDB.msgType === 'MsgHallHeros' ? CHANNEL.HALL_HEROS : CHANNEL.HALL_ZEROS;
        client.channels.cache.get(channelHall).messages.fetch(msgDB.msgId)
        .then(msg => {
            // on charge le collecteur
            // le remove n'est pas pris en compte de suite, je sais pas pk
            // exemple, msg a deja des reactions, le serveur reset, remove reaction = rine se passe
            // pas grave car on save le nb d'emoji a chaque fois
            loadCollectorHall(msg, msgDB);
        }).catch(async err => {
            // on supprime les msg qui n'existent plus
            await Msg.deleteOne({ _id: msgDB._id });
        });
    }
}

// Créé ou charge les reactions sur le message donnant les rôles
const loadRoleGiver = async (client, refresh = false, emojiDeleted) => {
    // TODO cooldown

    // recupere le channel, et l'unique message dedans (normalement)
    const roleChannel = await client.channels.fetch(CHANNEL.ROLE);
    const guild = roleChannel.guild;
    if (!roleChannel) {
        logger.error(`Le channel de rôle n'existe pas ! ID ${CHANNEL.ROLE}`);
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
                    // recup membre qui a cliqué
                    const member = await guild.members.fetch(u.id);
                    logger.info(`${u.tag} s'est ajouté le rôle ${role.name}`);
                    member.roles.add(role);
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
                    // recup membre qui a cliqué
                    const member = await guild.members.fetch(u.id);
                    logger.info(`${u.tag} s'est retiré le rôle ${role.name}`);
                    member.roles.remove(role);
                }
            }
        });
    }
}

module.exports = {
    loadCommands,
    loadEvents,
    loadBatch,
    loadReactionGroup,
    loadSlashCommands,
    loadRoleGiver,
    loadReactionMsg
}
