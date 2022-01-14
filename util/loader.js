const { readdirSync } = require('fs');
const { CHANNEL } = require('../config');
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
}
