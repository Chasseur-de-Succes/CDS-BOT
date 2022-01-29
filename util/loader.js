const { DiscordAPIError, Collection } = require('discord.js');
const { readdirSync } = require('fs');
const { CHANNEL, GUILD_ID } = require('../config');
const { loadJobs, searchNewGamesJob } = require('./batch/batch');
const { createReactionCollectorGroup } = require('./msg/group');

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
};

// Charge les 'batch'
const loadBatch = async (client) => {
    // TODO utiliser dir comme pour les autres load ?
    loadJobs(client);

    searchNewGamesJob(client);
}

// Charge les réactions des messages des groupes
const loadReactionGroup = async (client) => {
    // recupere TOUS les messages du channel de listage des groupes
    // TODO filtrer ?
    client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch()
        .then(msgs => {
            msgs.forEach(msg => {
                // filtre les msgs du BOT
                if (msg.author.bot) {
                    // recup le group associé au message (unique)
                    client.findGroup({ idMsg: msg.id })
                    .then(grps => {
                        // filtre group encore en cours
                        if (grps[0] && !grps[0].validated) {
                            createReactionCollectorGroup(client, msg, grps[0]);
                        }
                    })
                }
            });
        })
        .catch(err => {
            logger.error("Erreur load listener reaction groupes " + err);
        });
}

module.exports = {
    loadCommands,
    loadEvents,
    loadBatch,
    loadReactionGroup,
    loadSlashCommands
}
