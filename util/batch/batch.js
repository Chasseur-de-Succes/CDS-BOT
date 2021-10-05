const { scheduleJob } = require("node-schedule");
const { GUILD_ID } = require("../../config");
const { Job } = require("../../models");
const { createEmbedGroupInfo } = require("../msg/group");

module.exports = {
    createRappelJob(client, groupes) {        
        // créer scheduleJob, pour chaque groupe, qui s'exécute un jour avant la date de l'event (param ?)
        for (const groupe of groupes) {
            let dateEvent = groupe.dateEvent;
            if (dateEvent) {
                let dateRappel = new Date(dateEvent.getTime());
                dateRappel.setDate(dateEvent.getDate() - 1);
                
                let job = {
                    when: dateRappel,
                    what: 'envoiMpRappel',
                    args: [groupe._id],
                };
                
                // save job
                client.createJob(job)
                .then(jobDB => {
                    console.log(`\x1b[34m[INFO]\x1b[0m -- Création rappel le ${dateRappel} pour groupe ${groupe.name}..`);
                    //scheduleJob("*/10 * * * * *", function() {
                    scheduleJob(dateRappel, function(){
                        module.exports.envoiMpRappel(client, groupe);
                        // update job
                        jobDB.pending = false;
                        client.updateJob(jobDB);
                    });
                })
                
            }
        }
    },

    loadJobs(client) {
        // récupére les job de la DB non terminé
        client.findJob({pending: true})
        .then(jobs => {
            console.log(`\x1b[34m[INFO]\x1b[0m -- Chargement ${jobs.length} job ..`);
            // lancement jobs
            for (const job of jobs) {
                scheduleJob(job.when, function() {
                    require('./batch')[job.what](client, job.args[0]);
                });
            }
        });
    },

    envoiMpRappel: function(client, groupeId) {
        const membersGuild = client.guilds.cache.get(GUILD_ID).members.cache;
        client.findGroupById(groupeId)
        .then(groupe => {
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

// exports.createRappelJob = createRappelJob