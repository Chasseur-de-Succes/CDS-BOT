const { scheduleJob } = require("node-schedule");
const { GUILD_ID } = require("../../config");
const { createEmbedGroupInfo } = require("../msg/group");

function createRappelJob(client, groupes) {
    console.log('hey', groupes);
    const membersGuild = client.guilds.cache.get(GUILD_ID).members.cache;
    
    // créer scheduleJob, pour chaque groupe, qui s'exécute un jour avant la date de l'event (param ?)
    for (const groupe of groupes) {
        let dateEvent = groupe.dateEvent;
        if (dateEvent) {
            let dateRappel = new Date(dateEvent.getTime());
            dateRappel.setDate(dateEvent.getDate() - 1);
            
            console.log(`\x1b[34m[INFO]\x1b[0m -- Création rappel le ${dateRappel} pour groupe ${groupe.name}..`);
            //scheduleJob("*/10 * * * * *", function() {
            scheduleJob(dateRappel, function(){
                console.log(`\x1b[34m[INFO]\x1b[0m Envoi MP rappel pour groupe ${groupe.name}!`);
                // va MP tous les joueurs présents dans le groupe
                for (const member of groupe.members) {
                    const crtUser = membersGuild.get(member.userId);
                    if (crtUser) {
                        const rappelEmbed = createEmbedGroupInfo(membersGuild, groupe, false);
                        crtUser.send({content: `**⏰ RAPPEL** dans 1 jour, tu participes à un évènement : `, embeds: [rappelEmbed]});
                    }
                }
            });
        }
    }
}

exports.createRappelJob = createRappelJob