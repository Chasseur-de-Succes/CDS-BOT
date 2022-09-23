const { scheduleJob, scheduledJobs } = require("node-schedule");
const { createEmbedGroupInfo } = require("../msg/group");
const { TAGS, delay, crtHour } = require('../../util/constants');
const moment = require("moment");
const { User } = require("../../models");
const { createLogs } = require("../envoiMsg");
const { MONEY } = require("../../config");

module.exports = {
    /**
     * Créer rappel, pour chaque groupe, qui s'exécute un jour avant et 1h avant la date de l'event 
     * @param {*} client le client
     * @param {*} groupes les groupes à rappeler
     */
    createRappelJob(client, guildId, groupes) {
        for (const groupe of groupes) {
            let dateEvent = groupe.dateEvent;
            if (dateEvent) {
                let i = 0;
                const options = { year: 'numeric', month: 'short', day: 'numeric' };

                dateEvent.forEach(date => {
                    // 1j avant
                    let dateRappel1j = new Date(date.getTime());
                    dateRappel1j.setDate(date.getDate() - 1);
                    
                    let jobName = `rappel_1d_${groupe.name}_${date.toLocaleDateString('fr-FR', options)}`;
                    
                    let job1j = {
                        name: jobName,
                        guildId: guildId,
                        when: dateRappel1j,
                        what: 'envoiMpRappel',
                        args: [groupe._id, 'jour'],
                    };
                    
                    if (dateRappel1j > new Date())
                        module.exports.updateOrCreateRappelJob(client, job1j, groupe);
                    
                    // TODO regrouper car similaire a au dessus ? 
                    // ou attendre que la methode soit fini et faire la suite
                    // 1h avant
                    let dateRappel1h = new Date(date.getTime());
                    dateRappel1h.setHours(date.getHours() - 1);
    
                    jobName = `rappel_1h_${groupe.name}_${date.toLocaleDateString('fr-FR', options)}`;
                    
                    let job1h = {
                        name: jobName,
                        guildId: guildId,
                        when: dateRappel1h,
                        what: 'envoiMpRappel',
                        args: [groupe._id, 'heure'],
                    };
                    
                    if (dateRappel1h > new Date())
                        module.exports.updateOrCreateRappelJob(client, job1h, groupe);

                    i++;
                });
            }
        }
    },

    /**
     * Créer ou maj le {@link Job}
     * @param {*} client le client
     * @param {*} job le Job à créer ou maj
     * @param {*} groupe le groupe lié au job
     */
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
                        module.exports.envoiMpRappel(client, job.guildId, groupe, job.args[1]);
                        // update job
                        jobDB.pending = false;
                        client.update(jobDB, {pending: false});
                    });
                })
            } else {
                let jobDB = jobs[0];
                logger.info("-- Update "+jobDB.name+" pour groupe "+groupe.name+"..");
                // update job
                client.update(jobDB, {when: job.when});

                // cancel ancien job si existe
                if (scheduledJobs[job.name])
                    scheduledJobs[job.name].cancel();
                
                // pour le relancer
                scheduleJob(job.name, job.when, function(){
                    module.exports.envoiMpRappel(client, job.guildId, groupe, job.args[1]);
                    // update job
                    jobDB.pending = false;
                    client.update(jobDB, {pending: false});
                });
            }
        })
    },

    /**
     * Charge les différents jobs (rappels, ...)
     * @param {*} client 
     */
    loadJobs(client) {
        // récupére les job de la DB non terminé
        client.findJob({pending: true})
        .then(jobs => {
            logger.info("-- Chargement de "+jobs.length+" jobs..");
            // lancement jobs
            for (const job of jobs) {
                scheduleJob(job.name, job.when, function() {
                    require('./batch')[job.what](client, job.guildId, job.args[0], job.args[1]);
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

    /**
     * Envoie un MP de rappel
     * @param {*} client le client
     * @param {*} groupeId l'id du groupe 
     * @param {*} typeHoraire le type d'horaire (jours/heures)
     */
    envoiMpRappel: function(client, guildId, groupeId, typeHoraire) {
        const membersGuild = client.guilds.cache.get(guildId).members.cache;
        client.findGroupById(groupeId)
        .then(groupe => {
            // TODO a filtrer depuis findGroupe
            if (!groupe?.validated) {
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
    },

    searchNewGamesJob(client) {
        logger.info(`-- Mise en place job search new games`);

        // refresh games tous les soirs à 1h
        scheduleJob({ hour: 1, minute: 00 }, async function() {
            moment.updateLocale('fr', { relativeTime : Object });
            logger.info(`Début refresh games ..`);
            try {
                await client.fetchAllApps();
            } catch (error) {
                logger.error(`error lors job refresh games : ${error}`);
            }
        });
    },

    resetMoneyLimit() {
        logger.info(`--  Mise en place batch reset limit money`);
        // refresh games tous les soirs à 0h
        scheduleJob({ hour: 0, minute: 00 }, async function() {
            logger.info(`Début reset limit money ..`);

            User.updateMany({}, { moneyLimit: 0 })
            .then(res => logger.info(`..reset limit money ok`))
            .catch(err => logger.error(`Erreur lors reset limit money ${err}`))
        });
    },

    loadJobHelper(client) {
        logger.info(`--  Mise en place batch envoi money au @helper du discord CDS (s'il existe)`);
        // 971508881165545544
        // tous les lundi, à 0h01
        scheduleJob({ dayOfWeek: 1, hour: 0, minute: 01 }, async function() {
            client.guilds.cache.forEach(guild => {
                logger.info(`.. recherche @Helper dans ${guild.name}..`);
                
                guild.roles.fetch('971508881165545544')
                .then(roleHelper => {
                    if (roleHelper?.members) {
                            let helpers = roleHelper.members.map(m => m.toString()).join(', ');
                            roleHelper.members.each(async member => {
                                const user = member.user;
                                const userDB = await client.getUser(user);

                                // si dans bdd
                                if (userDB) {
                                    logger.info(`.. On est lundi ! On donne 100 point à ${userDB.username}`)
                                    await User.updateOne(
                                        { userId: user.id },
                                        { $inc: { money : 100 } }
                                    );
                                }
                            })

                            createLogs(client, guild.id, `Distribution au @Helper`, `${helpers} recoivent chacun **100 ${MONEY}** pour leur aide !`);
                        }
                    })
                    .catch(err => logger.error(`Impossible de trouver rôle @Helper ${err}`));
            });
        });
    }
}

// exports.createRappelJob = createRappelJob