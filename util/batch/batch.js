const { scheduleJob, scheduledJobs, RecurrenceRule } = require("node-schedule");
const { GUILD_ID } = require("../../config");
const { update } = require("../../models/user");
const { createEmbedGroupInfo } = require("../msg/group");

module.exports = {
    createRappelJob(client, groupes) {
        // créer scheduleJob, pour chaque groupe, qui s'exécute un jour avant et 1h avant la date de l'event 
        for (const groupe of groupes) {
            let dateEvent = groupe.dateEvent;
            if (dateEvent) {
                // 1j avant
                let dateRappel1j = new Date(dateEvent.getTime());
                dateRappel1j.setDate(dateEvent.getDate() - 1);
                
                let jobName = `rappel_1d_${groupe.name}`;
                
                let job1j = {
                    name: jobName,
                    when: dateRappel1j,
                    what: 'envoiMpRappel',
                    args: [groupe._id, 'jour'],
                };
                
                if (dateRappel1j > new Date())
                    module.exports.updateOrCreateRappelJob(client, job1j, groupe);
                
                // TODO regrouper car similaire a au dessus ? 
                // ou attendre que la methode soit fini et faire la suite
                // 1h avant
                let dateRappel1h = new Date(dateEvent.getTime());
                dateRappel1h.setHours(dateEvent.getHours() - 1);

                jobName = `rappel_1h_${groupe.name}`;
                
                let job1h = {
                    name: jobName,
                    when: dateRappel1h,
                    what: 'envoiMpRappel',
                    args: [groupe._id, 'heure'],
                };
                
                if (dateRappel1h > new Date())
                    module.exports.updateOrCreateRappelJob(client, job1h, groupe);
            }
        }
    },

    updateOrCreateRappelJob(client, job, groupe) {
        // si job existe -> update date, sinon créé
        client.findJob({name: job.name})
        .then(jobs => {
            if (jobs.length == 0) {
                // save job
                client.createJob(job)
                .then(jobDB => {
                    logger.info("-- Création rappel le "+job.when+" pour groupe "+groupe.name+"..");
                    //scheduleJob("*/10 * * * * *", function() {
                    scheduleJob(job.name, job.when, function(){
                        module.exports.envoiMpRappel(client, groupe, job.args[1]);
                        // update job
                        jobDB.pending = false;
                        client.updateJob(jobDB, {pending: false});
                    });
                })
            } else {
                let jobDB = jobs[0];
                logger.info("-- Update "+jobDB.name+" pour groupe "+groupe.name+"..");
                // update job
                client.updateJob(jobDB, {when: job.when});

                // cancel ancien job si existe
                if (scheduledJobs[job.name])
                    scheduledJobs[job.name].cancel();
                
                // pour le relancer
                scheduleJob(job.name, job.when, function(){
                    module.exports.envoiMpRappel(client, groupe, job.args[1]);
                    // update job
                    jobDB.pending = false;
                    client.updateJob(jobDB, {pending: false});
                });
            }
        })
    },

    deleteRappelJob(client, groupe) {
        const jobName = `rappel_${groupe.name}`;

        // cancel ancien job si existe
        if (scheduledJobs[jobName])
            scheduledJobs[jobName].cancel();

        // si job existe -> update date, sinon créé
        client.findJob({name: jobName})
        .then(jobs => {
            if (jobs.length > 0) {
                let jobDB = jobs[0];
                logger.info("-- Suppression "+jobDB.name+" pour groupe "+groupe.name+"..");
                client.deleteJob(jobDB);
            }
        })
    },

    loadJobs(client) {
        // récupére les job de la DB non terminé
        client.findJob({pending: true})
        .then(jobs => {
            logger.info("-- Chargement de "+jobs.length+" jobs..");
            // lancement jobs
            for (const job of jobs) {
                scheduleJob(job.name, job.when, function() {
                    require('./batch')[job.what](client, job.args[0]);
                });
            }
        });

        // clean ceux qui sont terminés ou qui ont dates dépassées, à minuit
        scheduleJob({hour: 0, minute: 0}, function() {
            client.findJob({ $or: [{pending: false}, {when: { $lte: new Date() }} ]})
            .then(jobs => {
                logger.info("-- Suppression de "+jobs.length+" jobs..");
                // lancement jobs
                for (const job of jobs) {
                    // cancel ancien job si existe
                    if (scheduledJobs[job.name])
                        scheduledJobs[job.name].cancel();
                    client.deleteJob(job);
                }
            });
        });
    },

    envoiMpRappel: function(client, groupeId, typeHoraire) {
        const membersGuild = client.guilds.cache.get(GUILD_ID).members.cache;
        client.findGroupById(groupeId)
        .then(groupe => {
            // TODO a filtrer depuis findGroupe
            if (!groupe.validated) {
                logger.info("Envoi MP rappel pour groupe "+groupe.name+" !");
                // va MP tous les joueurs présents dans le groupe
                for (const member of groupe.members) {
                    const crtUser = membersGuild.get(member.userId);
                    if (crtUser) {
                        const rappelEmbed = createEmbedGroupInfo(membersGuild, groupe, false);
                        crtUser.send({content: `**⏰ RAPPEL** dans 1 ${typeHoraire}, tu participes à un évènement : `, embeds: [rappelEmbed]});
                    }
                }
            }
        });
    }
}

// exports.createRappelJob = createRappelJob
