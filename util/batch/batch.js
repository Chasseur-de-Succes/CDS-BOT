const { scheduleJob, scheduledJobs } = require("node-schedule");
const { createEmbedGroupInfo } = require("../msg/group");
const { SALON, WEBHOOK } = require('../../util/constants');
const advent = require('../../data/advent/calendar.json');
const { GREEN, NIGHT, VERY_PALE_BLUE, DARK_RED } = require("../../data/colors.json");
const moment = require('moment-timezone');
const { User, Game } = require("../../models");
const { createLogs } = require("../envoiMsg");
const { EmbedBuilder, AttachmentBuilder, WebhookClient } = require("discord.js");
const { monthDiff, daysDiff, retryAfter5min } = require("../util");

const SteamUser = require('steam-user');
let steamClient = new SteamUser();
const FS = require('fs');

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

    async testEcuyer(client) {
        logger.info(`--  Mise en place batch 'écuyer'`);
        // tous les soirs à minuit
        scheduleJob({ hour: 0, minute: 00, tz: 'Europe/Paris' }, async function() {
            client.guilds.cache.forEach(async guild => {
                logger.info(`.. début batch 'écuyer' pour ${guild.name}..`);

                let members = await guild.members.fetch({ force: true });
                // Chasseur
                const chasseur = guild.roles.cache.find(r => r.name === 'Chasseur');
                // Ecuyer 
                const ecuyer = guild.roles.cache.find(r => r.name === 'Écuyer');
                // Channel acces clefs
                const askGiveaway = guild.channels.cache.find(c => c.name === '🔓accès-clefs-offertes');

                if (!chasseur || !ecuyer) {
                    console.log('.. role Écuyer ou Chasseur pas encore créé pour ' + guild.name);
                } else {
                    // récup tous les users Discord, non bot, n'étant pas 'Chasseur'
                    members = members.filter(m => !m._roles.includes(chasseur.id) && !m.user.bot)
                    
                    // si leur date d'arrivée dans le discord >= 2mois (~61 jours), on donne 'Chasseur'
                    // sinon Ecuyer
                    members.each(async m => {
                        if (daysDiff(m.joinedAt, new Date()) >= 61) {
                            // - prevenir user
                            logger.info(`.. ${m.user.tag} devient Chasseur ! (présence de +2mois)`);
                            const embed = new EmbedBuilder()
                                .setColor(GREEN)
                                .setTitle(`🥳 Félicitations ${m.user.username} ! 🥳`)
                                .setDescription(`Cela fait (au moins) **2 mois** que tu es sur le Discord CDS.\n
                                                Tu es maintenant un **Chasseur** !
                                                Tu peux maintenant :
                                                - demander l'accès au salon des clefs offertes, via ${askGiveaway}
                                                - participer aux événements spéciaux CDS`);
                            
                            m.user.send({ embeds: [embed] })
                                .catch(err => logger.error(`Impossible d'envoyé MP à ${m.user.tag} : ${err}`));

                            // - log
                            await createLogs(client, guild.id, "Nouveau 'Chasseur'", `${m.user} devient 'Chasseur.\nCompte vieux de ${daysDiff(m.joinedAt, new Date())} jours`, '', VERY_PALE_BLUE);

                            m.roles.remove(ecuyer)
                                .catch(err => logger.error(`Impossible de supprimer le rôle Écuyer à ${m.user.tag} : ${err}`));
                            m.roles.add(chasseur)
                                .catch(err => logger.error(`Impossible d'ajouter le rôle Chasseur à ${m.user.tag} : ${err}`));
                        } else {
                            m.roles.add(ecuyer)
                                .catch(err => logger.error(`Impossible d'ajouter le rôle Écuyer à ${m.user.tag} : ${err}`));
                        }
                    });
                }
            });
        });
    },

    async loadSteamPICS(client) {
        console.log('.. init PICS');
        steamClient.setOption('enablePicsCache', true)
        //steamClient.setOption('changelistUpdateInterval', 1000)
        steamClient.logOn(); // Log onto Steam anonymously

        // TODO refactor, même process pour changelist et appupdate..
        steamClient.on('changelist', async (changenumber, apps, packages) => {
            // console.log(' --- changelist ', changenumber);
            // console.log(apps);
            apps.forEach(async appid => {
                console.log('--- changelist ', appid);
                // - recup jeu BDD
                let game = await Game.findOne({ appid: appid });
                
                if (!game) {
                    console.log(` ** ${appid} pas dans bdd`);
                } else {
                    // - getProductInfo
                    let result = await steamClient.getProductInfo([appid], [], true); // Passing true as the third argument automatically requests access tokens, which are required for some apps
                    let appinfo = result.apps[appid].appinfo;

                    // si update est un jeu ou demo ?
                    if (appinfo?.common?.type === 'Game' || appinfo?.common?.type === 'Demo') {
                        // - recup achievements (si présent)
                        // - si trop de requete (error 429) => timeout 5min, et on recommence
                        retryAfter5min(async function() {
                            const resp = await client.getSchemaForGame(appid);
                            // si jeu a des succès
                            if (resp.availableGameStats?.achievements) {
                                const achievementsDB = game.achievements;
                                const achievements = resp.availableGameStats.achievements;
                
                                // - ajout & save succes dans Game
                                achievements.forEach(el => {
                                    el['apiName'] = el['name'];
                                    delete el.name;
                                    delete el.defaultvalue;
                                    delete el.hidden;
                                });

                                // - comparer succès
                                    // - ajouté (difference entre PICS et DB)
                                const deleted = achievementsDB.filter(({ apiName: api1 }) => !achievements.some(({ apiName: api2 }) => api2 === api1));
                                    // - supprimé (difference entre DB et PICS)
                                const added = achievements.filter(({ apiName: api1 }) => !achievementsDB.some(({ apiName: api2 }) => api2 === api1));

                                let deletedStr = deleted.map(a => `**${a.displayName}** : ${a.description ?? ''}`).join('\n');
                                // - limit 4096 caracteres
                                if (deletedStr.length > 4000)
                                    deletedStr = deletedStr.substring(0, 4000) + "...";
                                let addedStr = added.map(a => `**${a.displayName}** : ${a.description ?? ''}`).join('\n');
                                // - limit 4096 caracteres
                                if (addedStr.length > 4000)
                                    addedStr = addedStr.substring(0, 4000) + "...";

                                const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
                                
                                const steamLink = `[Steam](https://steamcommunity.com/app/${game.appid})`;
                                const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${game.appid})`;
                                const shLink = `[SteamHunters](https://steamhunters.com/apps/${game.appid}/achievements)`;
                                const cmeLink = `[Completionist](https://completionist.me/steam/app/${game.appid})`;
                                
                                const links = `${steamLink} | ${astatLink} | ${shLink} | ${cmeLink}`;

                                // - embed info jeu
                                const embeds = [];
                                const jeuEmbed = new EmbedBuilder()
                                    .setTitle(`${game.name}`)
                                    .addFields({ name: 'Liens', value: links })
                                    .setThumbnail(gameUrlHeader)
                                    .setColor(0x00FFFF)
                                    .setTimestamp();
                                embeds.push(jeuEmbed);

                                // - embed deleted / added succès
                                const deletedEmbed = new EmbedBuilder()
                                    .setTitle('Supprimé')
                                    .setColor(DARK_RED);
                                    // - nouveau ? (ssi 0 succes dans game) 
                                const addedEmbed = new EmbedBuilder()
                                    .setTitle(game.achievements.length === 0 ? 'Nouveau' : 'Ajouté')
                                    .setColor(GREEN);

                                if (deleted.length > 0) {
                                    deletedEmbed.setDescription(`${deleted.length} succès supprimé${deleted.length > 1 ? 's' : ''}
                                        ${deletedStr}`);
                                    embeds.push(deletedEmbed);
                                }
                                if (added.length > 0) {
                                    addedEmbed.setDescription(`${added.length} nouveau${added.length > 1 ? 'x' : ''} succès (${achievements.length} au total)
                                        ${addedStr}`);
                                    embeds.push(addedEmbed);
                                }

                                if (deleted.length > 0 || added.length > 0) {
                                    // pour chaque guild, on recup le webhook
                                    //const webhookClient = new WebhookClient({ url: 'https://discord.com/api/webhooks/1067564659609174117/Zxnf-gLKgfIECktJe3diFyUsC5KFql7vfh-LyvfFEwV55Vw7dPoURYO6OkPpN-aedXbV' });
                                    client.guilds.cache.forEach(async guild => {
                                        const webhookUrl = await client.getGuildWebhook(guild.id, WEBHOOK.FEED_ACHIEVEMENT);
                                        
                                        if (webhookUrl) {
                                            const webhookClient = new WebhookClient({ url: webhookUrl });

                                            let avatarURL = '';
                                            if (game.iconHash) {
                                                avatarURL = `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.iconHash}.jpg`;
                                            } else {
                                                avatarURL = 'https://avatars.cloudflare.steamstatic.com/cc288975bf62c132f5132bc3452960f3341b665c_full.jpg';
                                            }
                                            
                                            webhookClient.send({
                                                username: game.name,
                                                avatarURL: avatarURL,
                                                embeds: embeds,
                                            });
                                        } else {
                                            logger.warn('URL Webhook non défini !');
                                        }
                                    });
                                }

                                // et on save
                                game.achievements = achievements;
                                await game.save();
                            } else {
                                // TODO si genre tout supprimer ? tester si game a des succes du coup
                                console.log(` ** ${appid} plus de succès ?`);
                            }
                        });
                    }
                    
                    // TODO faire comme dans appUpdate => créer function qui devra être re-appeler si error 429
                }
            });
            // console.log('--------');
        });
        steamClient.on('appUpdate', async (appid, data) => {
            console.log('-- UPDATE ', appid);
            // console.log(data);

            // si update est un jeu ou demo ?
            if (data?.appinfo?.common?.type === 'Game' || data?.appinfo?.common?.type === 'Demo') {
                // - recup jeu BDD
                let game = await Game.findOne({ appid: appid });
                if (!game) {
                    // TODO ne rien faire ?
                    console.log(` ** ${appid} pas dans bdd`);
                } else {
                    // - recup achievements (si présent)
                    // - si trop de requete (error 429) => timeout 5min, et on recommence
                    retryAfter5min(async function() {
                        const resp = await client.getSchemaForGame(appid);
                        
                        // si jeu a des succès
                        if (resp.availableGameStats?.achievements) {
                            const achievementsDB = game.achievements;
                            const achievements = resp.availableGameStats.achievements;
            
                            // - ajout & save succes dans Game
                            achievements.forEach(el => {
                                el['apiName'] = el['name'];
                                delete el.name;
                                delete el.defaultvalue;
                                delete el.hidden;
                            });
    
                            // - comparer succès
                                // - ajouté (difference entre PICS et DB)
                            const deleted = achievementsDB.filter(({ apiName: api1 }) => !achievements.some(({ apiName: api2 }) => api2 === api1));
                                // - supprimé (difference entre DB et PICS)
                            const added = achievements.filter(({ apiName: api1 }) => !achievementsDB.some(({ apiName: api2 }) => api2 === api1));
    
                            let deletedStr = deleted.map(a => `**${a.displayName}** : ${a.description ?? ''}`).join('\n');
                            // - limit 4096 caracteres
                            if (deletedStr.length > 4000)
                                deletedStr = deletedStr.substring(0, 4000) + "...";
                            let addedStr = added.map(a => `**${a.displayName}** : ${a.description ?? ''}`).join('\n');
                            // - limit 4096 caracteres
                            if (addedStr.length > 4000)
                                addedStr = addedStr.substring(0, 4000) + "...";
    
                            const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
                            
                            const steamLink = `[Steam](https://steamcommunity.com/app/${game.appid})`;
                            const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${game.appid})`;
                            const shLink = `[SteamHunters](https://steamhunters.com/apps/${game.appid}/achievements)`;
                            const cmeLink = `[Completionist](https://completionist.me/steam/app/${game.appid})`;
                            
                            const links = `${steamLink} | ${astatLink} | ${shLink} | ${cmeLink}`;
    
                            // - embed info jeu
                            const embeds = [];
                            const jeuEmbed = new EmbedBuilder()
                                .setTitle(`${game.name}`)
                                .addFields({ name: 'Liens', value: links })
                                .setThumbnail(gameUrlHeader)
                                .setColor(0x00FFFF)
                                .setTimestamp();
                            embeds.push(jeuEmbed);
    
                            // - embed deleted / added succès
                            const deletedEmbed = new EmbedBuilder()
                                .setTitle('Supprimé')
                                .setColor(DARK_RED);
                                // - nouveau ? (ssi 0 succes dans game) 
                            const addedEmbed = new EmbedBuilder()
                                .setTitle(game.achievements.length === 0 ? 'Nouveau' : 'Ajouté')
                                .setColor(GREEN);
    
                            if (deleted.length > 0) {
                                deletedEmbed.setDescription(`${deleted.length} succès supprimé${deleted.length > 1 ? 's' : ''}
                                    ${deletedStr}`);
                                embeds.push(deletedEmbed);
                            }
                            if (added.length > 0) {
                                addedEmbed.setDescription(`${added.length} nouveau${added.length > 1 ? 'x' : ''} succès (${achievements.length} au total)
                                    ${addedStr}`);
                                embeds.push(addedEmbed);
                            }
    
                            if (deleted.length > 0 || added.length > 0) {
                                client.guilds.cache.forEach(async guild => {
                                    const webhookUrl = await client.getGuildWebhook(guild.id, WEBHOOK.FEED_ACHIEVEMENT);
                                    
                                    if (webhookUrl) {
                                        const webhookClient = new WebhookClient({ url: webhookUrl });

                                        let avatarURL = '';
                                        if (game.iconHash) {
                                            avatarURL = `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.iconHash}.jpg`;
                                        } else {
                                            avatarURL = 'https://avatars.cloudflare.steamstatic.com/cc288975bf62c132f5132bc3452960f3341b665c_full.jpg';
                                        }
                                        
                                        webhookClient.send({
                                            username: game.name,
                                            avatarURL: avatarURL,
                                            embeds: embeds,
                                        });
                                    } else {
                                        logger.warn('URL Webhook non défini !');
                                    }
                                });
                            }
    
                            // et on save
                            game.achievements = achievements;
                            await game.save();
                        } else {
                            // TODO si genre tout supprimer ? tester si game a des succes du coup
                            console.log(` ** ${appid} plus de succès ?`);
                        }
                    });
                }
            }


            // console.log("Requesting appinfo for TF2 and CS:GO...");
            // let result = await steamClient.getProductInfo([1247740], [432977], true); // Passing true as the third argument automatically requests access tokens, which are required for some apps
        
            // console.log("Got app info, writing to files");
            // console.log(result);
        
            // for (let appid in result.apps) {
            //     //FS.writeFileSync(appid + '.json', JSON.stringify(result.apps[appid].appinfo, null, "\t"));
            //     let changes = await steamClient.getProductChanges(result.apps[appid].changenumber);
                
            // }
            // for (let packageid in result.packages) {
            //     FS.writeFileSync(packageid + '.json', JSON.stringify(result.packages[packageid].packageinfo, null, "\t"));
            //     //let changes = await steamClient.getProductChanges(result.apps[appid].changenumber);
                
            // }
        
            // console.log("Logging off of Steam");
            // steamClient.logOff();
        });
    },

    loadEventAdvent(client) {
        logger.info(`--  Mise en place batch event`);

        // tous les jours, à 18h00
        //  only décembre
        scheduleJob({ month:11, hour: 18, minute: 00 }, async function() {
        //scheduleJob({ hour: 18, minute: 00, tz: 'Europe/Paris' }, async function() {
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