const { scheduleJob, scheduledJobs } = require("node-schedule");
const { createEmbedGroupInfo } = require("../msg/group");
const { SALON } = require('../../util/constants');
const advent = require('../../data/advent/calendar.json');
const {  NIGHT, VERY_PALE_BLUE } = require("../../data/colors.json");
const moment = require('moment-timezone');
const { User } = require("../../models");
const { createLogs } = require("../envoiMsg");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");

module.exports = {
    /**
     * Créer rappel, pour groupe, qui s'exécute un jour avant et 1h avant la date de l'event 
     * @param {*} client le client
     * @param {*} groupes les groupes à rappeler
     */
    async createRappelJob(client, guildId, groupe, date) {
        if (date) {
            let i = 0;
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            let d = moment.tz(date, "Europe/Paris");

            // 1j avant
            let jobName = `rappel_1d_${groupe.name}_${date.toLocaleDateString('fr-FR', options)}`;
            let minus1day = d.subtract(1, 'days');

            let job1j = {
                name: jobName,
                guildId: guildId,
                when: minus1day,
                what: 'envoiMpRappel',
                args: [groupe._id, 'jour'],
            };
            
            if (minus1day.isAfter(moment().tz("Europe/Paris")))
                await module.exports.updateOrCreateRappelJob(client, job1j, groupe, minus1day);

            // on rerajoute +1 jour
            d.add(1, 'days');
            
            // TODO regrouper car similaire a au dessus ? 
            // ou attendre que la methode soit fini et faire la suite
            // 1h avant
            jobName = `rappel_1h_${groupe.name}_${date.toLocaleDateString('fr-FR', options)}`;
            let minus1hour = d.subtract(1, 'hours');

            
            let job1h = {
                name: jobName,
                guildId: guildId,
                when: minus1hour,
                what: 'envoiMpRappel',
                args: [groupe._id, 'heure'],
            };

            if (minus1hour.isAfter(moment().tz("Europe/Paris")))
                await module.exports.updateOrCreateRappelJob(client, job1h, groupe, minus1hour);

            i++;
        }
    },

    /**
     * Créer ou maj le {@link Job}
     * @param {*} client le client
     * @param {*} job le Job à créer ou maj
     * @param {*} groupe le groupe lié au job
     */
    async updateOrCreateRappelJob(client, job, groupe, when) {
        try {
            const jobs = await client.findJob({name: job.name});
            
            // si job existe -> update date, sinon créé
            //if (jobs.length == 0) {
                // cancel ancien job si existe
                if (scheduledJobs[job.name])
                    scheduledJobs[job.name].cancel();
                
                // save job
                const jobDB = await client.createJob(job);

                logger.info("-- Création rappel le "+when+" pour groupe "+groupe.name+"..");
                logger.info('** ' + when.toDate());
                //scheduleJob("*/10 * * * * *", function() {
                scheduleJob(job.name, when.toDate(), function(){
                    module.exports.envoiMpRappel(client, job.guildId, groupe, job.args[1]);
                    // update job
                    jobDB.pending = false;
                    client.update(jobDB, {pending: false});
                });
            // } else {
            //     let jobDB = jobs[0];
            //     logger.info("-- Update "+jobDB.name+" pour groupe "+groupe.name+"..");
            //     // update job
            //     await client.update(jobDB, {when: when});

            //     // cancel ancien job si existe
            //     if (scheduledJobs[job.name])
            //         scheduledJobs[job.name].cancel();
                
            //     // pour le relancer
            //     scheduleJob(job.name, when.toDate(), function(){
            //         module.exports.envoiMpRappel(client, job.guildId, groupe, job.args[1]);
            //         // update job
            //         jobDB.pending = false;
            //         client.update(jobDB, {pending: false});
            //     });
            // }
        } catch (error) {
            console.log('ERREUR lors creation rappel job', error);
        }
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
        scheduleJob({hour: 0, minute: 0, tz: 'Europe/Paris' }, function() {
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
        scheduleJob({ hour: 1, minute: 00, tz: 'Europe/Paris' }, async function() {
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
        scheduleJob({ hour: 0, minute: 00, tz: 'Europe/Paris' }, async function() {
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
        scheduleJob({ dayOfWeek: 1, hour: 0, minute: 01, tz: 'Europe/Paris' }, async function() {
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

                            createLogs(client, guild.id, `Distribution au @Helper`, `${helpers} recoivent chacun **100 ${process.env.MONEY}** pour leur aide !`);
                        }
                    })
                    .catch(err => logger.error(`Impossible de trouver rôle @Helper ${err}`));
            });
        });
    },

    loadEvent(client) {
        logger.info(`--  Mise en place batch event`);

        // tous les jours, à 18h00
        // TODO only décembre
        //scheduleJob({ month:10, hour: 18, minute: 00 }, async function() {
        scheduleJob({ hour: 18, minute: 00, tz: 'Europe/Paris' }, async function() {
            client.guilds.cache.forEach(async guild => {
                const idAdvent = await client.getGuildChannel(guild.id, SALON.ADVENT);
                
                if (idAdvent) {
                    // recupere le channel
                    const eventChannel = await guild.channels.fetch(idAdvent);
    
                    let index = new Date().getDate();
                    // on incremente pour j+1 ?
                    /*if (index > 1)
                        index++;*/
                    // let index = 5;


                    // si == 25 on arrete !
                    // TODO si == 25 => JOYEUX NOEL !
                    if (index >= 25)
                        return;
                    if (index === 1) {
                        // message de "bienvenue"
                        let embedBienvenue = new EmbedBuilder()
                            .setColor(VERY_PALE_BLUE)
                            .setTitle(`***🎅 Oh oh oh 🎅*** - 🌟 Calendrier de l'avent des CDS 🌟`)
                            .setDescription(`Cette année, un calendrier de l'avent spéciale CDS :
                                ▶️ Tous les jours, à **18h**, une énigme vous sera proposée ! (concocté par les malicieux lutins chasseurs de succès ! 😈)
                                ▶️ ⚠️ Vous n'avez le droit qu'à **UNE** seule réponse ! Veuillez ne répondre que sur ce **salon** ! ⚠️
                                ▶️ **1 point** pour chaque bonne réponse, **0** sinon. Les 3 premiers à répondre **juste** auront des points **bonus** !
                                ▶️ Que gagne le 1er ? 🤔 **2️⃣4️⃣ clés Steam !** 🤩
                                ▶️ Vous pouvez voir le classement des points grâce à la commande \`/calendrier-de-l-avent\` 

                                C'est parti pour la 1ère énigme :
                            `);

                        await eventChannel.send({ embeds: [embedBienvenue] });
                    } else {
                        const infosHier = advent[index - 1];
                        if (!infosHier) 
                            return;

                        let embedReponseHier = new EmbedBuilder()
                            .setColor(VERY_PALE_BLUE)
                            .setTitle(`***🌟 Réponse d'hier 🌟***`)
                            .setDescription(`La réponse d'hier était :
                               ▶️ **${infosHier.reponse[0]}**`);

                        await eventChannel.send({ embeds: [embedReponseHier] });
                    }
                    
                    const infos = advent[index];

                    // en cas d'erreur sur le tableau, on ne va pas + loin (on sait jamais)
                    if (!infos) 
                        return;
                    
                    // rouge ou vert (couleur noel)
                    const color = index % 2 === 0 ? "#008000" : "#ff0000"

                    // preapre l'embed
                    let embed = new EmbedBuilder()
                        .setColor(color)
                        .setTitle(`🌟 Énigme jour ${index} 🌟`)
                        .setDescription(`${infos.question}`);
                    
                    // si type image, on ajoute l'image
                    if (infos.type === "img") {
                        const file = new AttachmentBuilder(`data/advent/${infos.data}`)
                        embed.setImage(`attachment://data/advent/${infos.data}`)

                        await eventChannel.send({ embeds: [embed], files: [file] });
                    } else {
                        await eventChannel.send({ embeds: [embed] });
                    }

                    // on renvoi un embed pour séparer
                    embed = new EmbedBuilder()
                        .setColor(NIGHT)
                        .setTitle(`**☆**:;;;;;:**☆**:;;;;;:**☆**:;;;;;:**☆**:;;;;;:**☆**:;;;;;:**☆**:;;;;;:**☆**`);
                    await eventChannel.send({ embeds: [embed] });
                }
            });
        });
    }
}

// exports.createRappelJob = createRappelJob