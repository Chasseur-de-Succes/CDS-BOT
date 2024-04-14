const { scheduleJob, scheduledJobs } = require("node-schedule");
const { createEmbedGroupInfo } = require("../msg/group");
const { WEBHOOK } = require("../../util/constants");
const {
    GREEN,
    VERY_PALE_BLUE,
    DARK_RED,
    ORANGE,
} = require("../../data/colors.json");
const moment = require("moment-timezone");
const { User, Game } = require("../../models");
const { createLogs } = require("../envoiMsg");
const { EmbedBuilder, WebhookClient } = require("discord.js");
const { daysDiff, retryAfter5min } = require("../util");

const SteamUser = require("steam-user");
const steamClient = new SteamUser();

module.exports = {
    /**
     * Créer rappel, pour groupe, qui s'exécute un jour avant et 1h avant la date de l'event
     * @param {*} client le client
     * @param {*} groupes les groupes à rappeler
     */
    async createRappelJob(client, guildId, groupe, date) {
        if (date) {
            let i = 0;
            const options = {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            };
            const d = moment.tz(date, "Europe/Paris");

            // 1j avant
            let jobName = `rappel_1d_${groupe.name}_${date.toLocaleDateString(
                "fr-FR",
                options,
            )}`;
            const minus1day = d.subtract(1, "days");

            const job1j = {
                name: jobName,
                guildId: guildId,
                when: minus1day,
                what: "envoiMpRappel",
                args: [groupe._id, "jour"],
            };

            if (minus1day.isAfter(moment().tz("Europe/Paris"))) {
                await module.exports.updateOrCreateRappelJob(
                    client,
                    job1j,
                    groupe,
                    minus1day,
                );
            }

            // on rerajoute +1 jour
            d.add(1, "days");

            // TODO regrouper car similaire a au dessus ?
            // ou attendre que la methode soit fini et faire la suite
            // 1h avant
            jobName = `rappel_1h_${groupe.name}_${date.toLocaleDateString(
                "fr-FR",
                options,
            )}`;
            const minus1hour = d.subtract(1, "hours");

            const job1h = {
                name: jobName,
                guildId: guildId,
                when: minus1hour,
                what: "envoiMpRappel",
                args: [groupe._id, "heure"],
            };

            if (minus1hour.isAfter(moment().tz("Europe/Paris"))) {
                await module.exports.updateOrCreateRappelJob(
                    client,
                    job1h,
                    groupe,
                    minus1hour,
                );
            }

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
            // cancel ancien job si existe
            if (scheduledJobs[job.name]) scheduledJobs[job.name].cancel();

            // save job
            const jobDb = await client.createJob(job);

            logger.info(
                `-- Création rappel le ${when} pour groupe ${groupe.name}..`,
            );
            logger.info(`** ${when.toDate()}`);

            scheduleJob(job.name, when.toDate(), () => {
                module.exports.envoiMpRappel(
                    client,
                    job.guildId,
                    groupe,
                    job.args[1],
                );
                // update job
                jobDb.pending = false;
                client.update(jobDb, { pending: false });
            });
        } catch (error) {
            logger.error("ERREUR lors creation rappel job", error);
        }
    },

    /**
     * Charge les différents jobs (rappels, ...)
     * @param {*} client
     */
    loadJobs(client) {
        // récupére les job de la DB non terminé
        client.findJob({ pending: true }).then((jobs) => {
            logger.info(`-- Chargement de ${jobs.length} jobs..`);
            // lancement jobs
            for (const job of jobs) {
                scheduleJob(job.name, job.when, () => {
                    require("./batch")[job.what](
                        client,
                        job.guildId,
                        job.args[0],
                        job.args[1],
                    );
                });
            }
        });

        // clean ceux qui sont terminés ou qui ont dates dépassées, à minuit
        scheduleJob({ hour: 0, minute: 0, tz: "Europe/Paris" }, () => {
            client
                .findJob({
                    $or: [{ pending: false }, { when: { $lte: new Date() } }],
                })
                .then((jobs) => {
                    logger.info(`-- Suppression de ${jobs.length} jobs..`);
                    // lancement jobs
                    for (const job of jobs) {
                        // cancel ancien job si existe
                        if (scheduledJobs[job.name]) {
                            scheduledJobs[job.name].cancel();
                        }
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
    envoiMpRappel: (client, guildId, groupeId, typeHoraire) => {
        const membersGuild = client.guilds.cache.get(guildId).members.cache;
        client.findGroupById(groupeId).then(async (groupe) => {
            // TODO a filtrer depuis findGroupe
            if (!groupe?.validated) {
                logger.info(
                    `Envoi rappel via MP et via channel pour groupe ${groupe.name} !`,
                );

                // envoi un message dans le channel du groupe
                if (groupe.channelId) {
                    const guild = await client.guilds.cache.get(guildId);
                    if (guild) {
                        const channel = await guild.channels.cache.get(
                            groupe.channelId,
                        );

                        if (channel) {
                            channel.send(
                                `> **⏰ RAPPEL** session prévue dans 1 ${typeHoraire} !`,
                            );
                        }
                    }
                }

                // va MP tous les joueurs présents dans le groupe
                for (const member of groupe.members) {
                    const crtUser = membersGuild.get(member.userId);
                    if (crtUser) {
                        const rappelEmbed = await createEmbedGroupInfo(
                            client,
                            membersGuild,
                            groupe,
                            false,
                        );
                        crtUser.send({
                            content: `**⏰ RAPPEL** dans 1 ${typeHoraire}, tu participes à un évènement : `,
                            embeds: [rappelEmbed],
                        });
                    }
                }
            }
        });
    },

    searchNewGamesJob(client) {
        logger.info("-- Mise en place job search new games");

        // refresh games tous les soirs à 1h
        scheduleJob({ hour: 1, minute: 0, tz: "Europe/Paris" }, async () => {
            moment.updateLocale("fr", { relativeTime: Object });
            logger.info("Début refresh games ..");
            try {
                await client.fetchAllApps();
            } catch (error) {
                logger.error(`error lors job refresh games : ${error}`);
            }
        });
    },

    resetMoneyLimit() {
        logger.info("--  Mise en place batch reset limit money");
        // refresh games tous les soirs à 0h
        scheduleJob({ hour: 0, minute: 0, tz: "Europe/Paris" }, async () => {
            logger.info("Début reset limit money ..");

            User.updateMany({}, { moneyLimit: 0 })
                .then(() => logger.info("..reset limit money ok"))
                .catch((err) =>
                    logger.error(`Erreur lors reset limit money ${err}`),
                );
        });
    },

    loadJobHelper(client) {
        logger.info(
            `--  Mise en place batch envoi money au @helper du discord CDS (s'il existe)`,
        );
        // 971508881165545544
        // tous les lundi, à 0h01
        scheduleJob(
            { dayOfWeek: 1, hour: 0, minute: 1, tz: "Europe/Paris" },
            async () => {
                for (const guild of client.guilds.cache.values()) {
                    logger.info(`.. recherche @Helper dans ${guild.name}..`);

                    guild.roles
                        .fetch("971508881165545544")
                        .then((roleHelper) => {
                            if (roleHelper?.members) {
                                const helpers = roleHelper.members
                                    .map((m) => m.toString())
                                    .join(", ");
                                roleHelper.members.each(async (member) => {
                                    const user = member.user;
                                    const userDb = await client.getUser(user);

                                    // si dans bdd
                                    if (userDb) {
                                        logger.info(
                                            `.. On est lundi ! On donne 100 point à ${userDb.username}`,
                                        );
                                        await User.updateOne(
                                            { userId: user.id },
                                            { $inc: { money: 100 } },
                                        );
                                    }
                                });

                                createLogs(
                                    client,
                                    guild.id,
                                    "Distribution au @Helper",
                                    `${helpers} recoivent chacun **100 ${process.env.MONEY}** pour leur aide !`,
                                );
                            }
                        })
                        .catch((err) =>
                            logger.error(
                                `Impossible de trouver rôle @Helper ${err}`,
                            ),
                        );
                }
            },
        );
    },

    async testEcuyer(client) {
        logger.info(`--  Mise en place batch 'écuyer'`);
        // tous les soirs à minuit
        scheduleJob({ hour: 0, minute: 0, tz: "Europe/Paris" }, async () => {
            for (const guild of client.guilds.cache.values()) {
                logger.info(`.. début batch 'écuyer' pour ${guild.name}..`);

                let members = await guild.members.fetch({ force: true });
                // Chasseur
                const chasseur = guild.roles.cache.find(
                    (r) => r.name === "Chasseur",
                );
                // Ecuyer
                const ecuyer = guild.roles.cache.find(
                    (r) => r.name === "Écuyer",
                );
                // Channel acces clefs
                const askGiveaway = guild.channels.cache.find(
                    (c) => c.name === "🔓accès-clefs-offertes",
                );

                if (chasseur && ecuyer) {
                    // récup tous les users Discord, non bot, n'étant pas 'Chasseur'
                    members = members.filter(
                        (m) => !(m._roles.includes(chasseur.id) || m.user.bot),
                    );

                    // si leur date d'arrivée dans le discord >= 2mois (~61 jours), on donne 'Chasseur'
                    // sinon Ecuyer
                    members.each(async (m) => {
                        if (daysDiff(m.joinedAt, new Date()) === 61) {
                            // - prevenir user
                            logger.info(
                                `.. ${m.user.tag} devient Chasseur ! (présence de +2mois)`,
                            );
                            const embed = new EmbedBuilder()
                                .setColor(GREEN)
                                .setTitle(
                                    `🥳 Félicitations ${m.user.username} ! 🥳`,
                                )
                                .setDescription(`Cela fait (au moins) **2 mois** que tu es sur le Discord CDS.\n
                                                Tu es maintenant un **Chasseur** !
                                                Tu peux maintenant :
                                                - demander l'accès au salon des clefs offertes, via ${askGiveaway}
                                                - participer aux événements spéciaux CDS`);

                            m.user
                                .send({ embeds: [embed] })
                                .catch((err) =>
                                    logger.error(
                                        `Impossible d'envoyé MP à ${m.user.tag} : ${err}`,
                                    ),
                                );

                            // - log
                            await createLogs(
                                client,
                                guild.id,
                                "Nouveau 'Chasseur'",
                                `${
                                    m.user
                                } devient 'Chasseur.\nCompte vieux de ${daysDiff(
                                    m.joinedAt,
                                    new Date(),
                                )} jours`,
                                "",
                                VERY_PALE_BLUE,
                            );

                            m.roles
                                .remove(ecuyer)
                                .catch((err) =>
                                    logger.error(
                                        `Impossible de supprimer le rôle Écuyer à ${m.user.tag} : ${err}`,
                                    ),
                                );
                            m.roles
                                .add(chasseur)
                                .catch((err) =>
                                    logger.error(
                                        `Impossible d'ajouter le rôle Chasseur à ${m.user.tag} : ${err}`,
                                    ),
                                );
                        } else {
                            m.roles
                                .add(ecuyer)
                                .catch((err) =>
                                    logger.error(
                                        `Impossible d'ajouter le rôle Écuyer à ${m.user.tag} : ${err}`,
                                    ),
                                );
                        }
                    });
                } else {
                    logger.info(
                        `.. role Écuyer ou Chasseur pas encore créé pour ${guild.name}`,
                    );
                }
            }
        });
    },

    async loadSteamPics(client) {
        logger.info(".. init PICS");
        steamClient.setOption("enablePicsCache", true);
        //steamClient.setOption('changelistUpdateInterval', 1000)
        steamClient.logOn(); // Log onto Steam anonymously

        steamClient.on("changelist", async (changenumber, apps) => {
            // console.log(' --- changelist ', changenumber);
            console.log(`-- appId changes ${apps.join(", ")}`);
            for (const appid of apps.filter(
                (value, index, array) => array.indexOf(value) === index,
            )) {
                // console.log('--- changelist ', appid);
                // - recup jeu BDD
                const game = await Game.findOne({ appid: appid });

                if (game) {
                    // - getProductInfo
                    const result = await steamClient.getProductInfo(
                        [appid],
                        [],
                        true,
                    ); // Passing true as the third argument automatically requests access tokens, which are required for some apps
                    const appinfo = result.apps[appid].appinfo;

                    // si update est un jeu ou demo ?
                    if (
                        appinfo?.common?.type === "Game" ||
                        appinfo?.common?.type === "Demo"
                    ) {
                        // recup icon
                        await recupIcon(steamClient, appid, game);

                        // - recup achievements (si présent)
                        recupAchievements(client, game);
                    }
                } else {
                    createNewGame(client, steamClient, appid);
                }
            }
            // console.log('--------');
        });
        steamClient.on("appUpdate", async (appid, data) => {
            logger.info("-- UPDATE ", appid);
            // console.log(data);

            // si update est un jeu ou demo ?
            if (
                data?.appinfo?.common?.type === "Game" ||
                data?.appinfo?.common?.type === "Demo"
            ) {
                // - recup jeu BDD
                // on le créé seulement,
                const game = await Game.findOne({ appid: appid });
                if (game) {
                    // recup icon
                    // await recupIcon(steamClient, appid, game);
                    // // - recup achievements (si présent)
                    // recupAchievements(client, game);
                } else {
                    createNewGame(client, steamClient, appid);
                }
            }
        });
    },
};

async function recupIcon(steamClient, appId, game) {
    // recup icon
    // Passing true as the third argument automatically requests access tokens, which are required for some apps
    const result = await steamClient.getProductInfo([appId], [], true);
    // if (result.apps[appId].appinfo?.common?.clienticon)
    // game.iconHash = result.apps[appId].appinfo.common.clienticon;
    // else
    if (result.apps[appId].appinfo?.common?.icon) {
        game.iconHash = result.apps[appId].appinfo.common.icon;
    }

    await game.save();
}

function recupAchievements(client, game) {
    // - si trop de requete (error 429) => timeout 5min, et on recommence
    retryAfter5min(async () => {
        const resp = await client.getSchemaForGame(game.appid);

        // si jeu a des succès
        if (resp.availableGameStats?.achievements) {
            const achievementsDb = game.achievements;
            const achievements = resp.availableGameStats.achievements;

            // - ajout & save succes dans Game
            for (const el of achivements) {
                el.apiName = el.name;
                el.name = undefined;
                el.defaultvalue = undefined;
                el.hidden = undefined;
            }

            // - comparer succès
            // - ajouté (difference entre PICS et DB)
            const deleted = achievementsDb.filter(
                ({ apiName: api1 }) =>
                    !achievements.some(({ apiName: api2 }) => api2 === api1),
            );
            // - supprimé (difference entre DB et PICS)
            const added = achievements.filter(
                ({ apiName: api1 }) =>
                    !achievementsDb.some(({ apiName: api2 }) => api2 === api1),
            );

            let deletedStr = deleted
                .map((a) => `**${a.displayName}** : ${a.description ?? ""}`)
                .join("\n");
            // - limit 4096 caracteres
            if (deletedStr.length > 4000) {
                deletedStr = `${deletedStr.substring(0, 4000)}...`;
            }
            let addedStr = added
                .map((a) => `**${a.displayName}** : ${a.description ?? ""}`)
                .join("\n");
            // - limit 4096 caracteres
            if (addedStr.length > 4000) {
                addedStr = `${addedStr.substring(0, 4000)}...`;
            }

            const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
            const links = createGameLinks(game.appid);

            // - embed info jeu
            const embeds = [];
            const jeuEmbed = new EmbedBuilder()
                .setTitle(`${game.name}`)
                .addFields({ name: "Liens", value: links })
                .setThumbnail(gameUrlHeader)
                .setColor(0x00ffff)
                .setTimestamp();
            embeds.push(jeuEmbed);

            // - embed deleted / added succès
            const deletedEmbed = new EmbedBuilder()
                .setTitle("❌ Supprimé")
                .setColor(DARK_RED);
            // - nouveau ? (ssi 0 succes dans game)
            const newSucces = game.achievements.length === 0;
            const addedEmbed = new EmbedBuilder()
                .setTitle(newSucces ? "✅ Nouveau" : "➕ Ajouté")
                .setColor(newSucces ? ORANGE : GREEN);

            if (deleted.length > 0) {
                deletedEmbed.setDescription(`${deleted.length} succès supprimé${
                    deleted.length > 1 ? "s" : ""
                }
                    ${deletedStr}`);
                embeds.push(deletedEmbed);
            }
            if (added.length > 0) {
                if (newSucces) {
                    addedEmbed.setDescription(
                        `**${added.length}** nouveau${
                            added.length > 1 ? "x" : ""
                        } succès !`,
                    );
                } else {
                    addedEmbed.setDescription(`${added.length} nouveau${
                        added.length > 1 ? "x" : ""
                    } succès (${achievements.length} au total)
                        ${addedStr}`);
                }
                embeds.push(addedEmbed);
            }

            if (deleted.length > 0 || added.length > 0) {
                sendToWebhook(client, game, embeds);
            }

            // et on save
            game.achievements = achievements;
            await game.save();
        } else {
            // TODO si genre tout supprimer ? tester si game a des succes du coup
        }
    });
}

function createGameLinks(appid) {
    const steamLink = `[Steam](https://steamcommunity.com/app/${appid})`;
    const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${appid})`;
    const shLink = `[SteamHunters](https://steamhunters.com/apps/${appid}/achievements)`;
    const cmeLink = `[Completionist](https://completionist.me/steam/app/${appid})`;

    return `${steamLink} | ${astatLink} | ${shLink} | ${cmeLink}`;
}

function createNewGame(client, steamClient, appid) {
    logger.info(` ** ${appid} pas dans bdd, on créé`);

    retryAfter5min(async () => {
        await client.fetchGame(appid, "system", "unknown", steamClient);

        // si pas de succès, balek
        if (game.achievements.length !== 0) {
            // - recup GameDB récemment créé
            const game = await Game.findOne({ appid: appid });
            let gamename = game.name;

            // - limit 80 caracteres
            if (gamename.length > 80) {
                gamename = `${gamename.substring(0, 76)}...`;
            }

            const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;

            const links = createGameLinks(game.appid);

            const jeuEmbed = new EmbedBuilder()
                .setTitle(`🆕 ${gamename}`)
                .addFields({ name: "Liens", value: links })
                .setThumbnail(gameUrlHeader)
                .setColor(0x00ffff)
                .setTimestamp();

            const addedEmbed = new EmbedBuilder()
                .setTitle(`avec ${game.achievements.length} succès`)
                .setColor(0x00ffff);

            sendToWebhook(client, game, [jeuEmbed, addedEmbed]);
        }
    });
}

async function sendToWebhook(client, game, embeds) {
    for (const guild of client.guilds.cache.values()) {
        const webhookUrl = await client.getGuildWebhook(
            guild.id,
            WEBHOOK.FEED_ACHIEVEMENT,
        );

        if (webhookUrl) {
            const webhookClient = new WebhookClient({ url: webhookUrl });

            let avatarUrl;
            if (game.iconHash) {
                // avatarURL = `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.iconHash}.ico`;
                avatarUrl = `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${game.iconHash}.jpg`;
            } else {
                avatarUrl =
                    "https://avatars.cloudflare.steamstatic.com/cc288975bf62c132f5132bc3452960f3341b665c_full.jpg";
            }

            await webhookClient.send({
                username: game.name,
                avatarURL: avatarUrl,
                embeds: embeds,
            });
        } else {
            logger.warn("URL Webhook non défini !");
        }
    }
}

// exports.createRappelJob = createRappelJob
