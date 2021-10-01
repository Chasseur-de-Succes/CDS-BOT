const { readdirSync } = require('fs');
const { createRappelJob } = require('./batch/batch');

const loadCommands = (client, dir = "./commands/") => {
    readdirSync(dir).forEach(dirs => {
        const commands = readdirSync(`${dir}/${dirs}/`).filter(files => files.endsWith(".js"));

        for (const file of commands) {
            const getFileName = require(`../${dir}/${dirs}/${file}`);
            client.commands.set(getFileName.help.name, getFileName);
            console.log(`\x1b[34m[INFO] \x1b[0mCommande chargée ${getFileName.help.name}`);
        };
    });
};

const loadEvents = (client, dir = "./events/") => {
    readdirSync(dir).forEach(dirs => {
        const events = readdirSync(`${dir}/${dirs}/`).filter(files => files.endsWith(".js"));

        for (const event of events) {
            const evt = require(`../${dir}/${dirs}/${event}`);
            const evtName = event.split('.')[0];
            client.on(evtName, evt.bind(null, client));
            console.log(`\x1b[34m[INFO] \x1b[0mÉvènement chargé ${evtName}`);
        };
    });
};

const loadBatch = async (client) => {
    // TODO utiliser dir comme pour les autres load ?
    // TODO garder job qquepart ?

    // -- batch rappel
    // recuperer tous les groupes à partir d'auj, TODO param ?
    let today = new Date();
    // let tomorrow = new Date();
    // tomorrow.setDate(today.getDate() + 1);

    const groupes = await client.findGroup({'dateEvent': {$gte: today.toISOString()}});
    console.log(`\x1b[34m[INFO]\x1b[0m Encore ${groupes?.length} groupe(s) trouvé(s) après ${today} ..`);
    createRappelJob(client, groupes);
}

module.exports = {
    loadCommands,
    loadEvents,
    loadBatch,
}