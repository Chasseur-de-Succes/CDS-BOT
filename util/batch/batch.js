const { scheduleJob, scheduledJobs } = require("node-schedule");
const { GUILD_ID } = require("../../config");
const { createEmbedGroupInfo } = require("../msg/group");
const { TAGS, delay, crtHour } = require('../../util/constants');
const moment = require("moment");

module.exports = {
    /**
     * Créer rappel, pour chaque groupe, qui s'exécute un jour avant et 1h avant la date de l'event 
     * @param {*} client le client
     * @param {*} groupes les groupes à rappeler
     */
    createRappelJob(client, groupes) {
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
                        module.exports.envoiMpRappel(client, groupe, job.args[1]);
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
                    module.exports.envoiMpRappel(client, groupe, job.args[1]);
                    // update job
                    jobDB.pending = false;
                    client.update(jobDB, {pending: false});
                });
            }
        })
    },

    /**
     * Supprimer un rappel et désactive le job lié à ce rappel
     * @param {*} client 
     * @param {*} groupe 
     */
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

    /**
     * Envoie un MP de rappel
     * @param {*} client le client
     * @param {*} groupeId l'id du groupe 
     * @param {*} typeHoraire le type d'horaire (jours/heures)
     */
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
    },

    searchNewGamesJob(client) {
        console.log(`\x1b[34m[INFO]\x1b[0m -- Mise en place job search new games..`);

        // refresh games tous les soirs à 1h
        scheduleJob({ hour: 1, minute: 00 }, async function() {
            moment.updateLocale('fr', { relativeTime : Object });
            console.log(`\x1b[34m[INFO]\x1b[0m Début refresh games ..`);
            let startTime = moment();
            let crtIdx = 1, cptGame = 0;
    
            // recupe depuis l'appid XXX
            const maxAppid = await client.findMaxAppId();
            client.getAppList(maxAppid)
            .then(async appList => {
                let games = appList.body.response.apps;
                // parcours de tous les jeux
        
                for (const game of games) {
                    if (crtIdx % 250 === 0) {
                        console.log(`\x1b[34m[INFO]\x1b[0m [${crtHour()}] - ${crtIdx}/${games.length} ..`);
                    }
        
                    if (game?.appid) {
                        let gameDB = await client.findGameByAppid(game.appid);
                        // si game existe déjà en base, on skip // TODO a enlever car ~50K game..
                        if (gameDB) {
                            console.debug(`GAME ${game.appid} trouvé !`);
                        } else {
                            // on recup les tags du jeu courant
                            try {
                                let app = await client.getAppDetails(game.appid);
                                let tags = app?.body[game.appid]?.data?.categories
                                // au cas où pas de tags ou undefined
                                tags = tags ? tags : [];
                                // on ne garde que les tags qui nous intéresse (MULTI, COOP et ACHIEVEMENTS)
                                // TODO voir pour faire autrement ? récupérer tous les tags peu importe et faire recherche sur les tags via Mongo ?
                                let isMulti = tags.some(tag => tag.id === TAGS.MULTI.id);
                                let isCoop = tags.some(tag => tag.id === TAGS.COOP.id);
                                let hasAchievements = tags.some(tag => tag.id === TAGS.ACHIEVEMENTS.id);
                                
                                // on créé un nouveau Game
                                let newGame = {
                                    appid: game.appid,
                                    name: game.name,
                                    isMulti: isMulti,
                                    isCoop: isCoop,
                                    hasAchievements: hasAchievements
                                }
                                await client.createGame(newGame);
                                cptGame++;
                            } catch (err) {
                                if (err.status === 429) {
                                    console.log(`\x1b[34m[INFO]\x1b[0m [${crtHour()}] - ${err}, on attend 5 min ..`);
                                    // att 5 min
                                    await delay(300000);
                                }
                            }
                        }
                    } else {
                        console.warn(`\x1b[33m[WARN] \x1b[0mJeu ${game} n'a pas d'appid ou n'existe pas.`);
                    }
                    
                    crtIdx++;
                }
        
                console.log(`\x1b[34m[INFO]\x1b[0m .. Fin refresh games en [${startTime.toNow()}], ${cptGame} jeux ajoutés`);
            }).catch(err => {
                console.log(`\x1b[31m[ERROR] \x1b[0mErreur refresh games : ${err}`);
                return;
            });
        });
    }
}

// exports.createRappelJob = createRappelJob
