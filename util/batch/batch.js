const { scheduleJob, scheduledJobs } = require("node-schedule");
const { createEmbedGroupInfo } = require("../msg/group");
const {
    GREEN,
    VERY_PALE_BLUE,
} = require("../../data/colors.json");
const moment = require("moment-timezone");
const { createLogs } = require("../envoiMsg");
const { EmbedBuilder } = require("discord.js");
const { daysDiff, getMonthName } = require("../util");

const { UserRepository, JobRepository, GuildConfigRepository, TowerRepository } = require("../../repositories");

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
    async loadJobs(client) {
        // récupère les jobs de la DB non terminé
        const jobsPending = await JobRepository.findPending();
        logger.info(`-- Chargement de ${jobsPending.length} jobs..`);
        for (const job of jobsPending) {
            scheduleJob(job.name, job.when, () => {
                require("./batch")[job.what](
                    client,
                    job.guildId,
                    job.args[0],
                    job.args[1],
                );
            });
        }


        // clean ceux qui sont terminés ou qui ont des dates dépassées, à minuit
        scheduleJob({ hour: 0, minute: 0, tz: "Europe/Paris" }, async () => {
            const jobsToCancel = await JobRepository.findObsolete();
            logger.info(`-- Suppression de ${jobsToCancel.length} jobs..`);
            for (const job of jobsToCancel) {
                logger.info(`.. suppression du job ${job.id} (date dépassée)`);
                // cancel ancien job si existe
                if (scheduledJobs[job.name]) {
                    scheduledJobs[job.name].cancel();
                }
                await JobRepository.delete(job.id);
            }
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
        logger.info("-- Mise en place batch reset limit money");
        // refresh games tous les soirs à 0h
        scheduleJob({ hour: 0, minute: 0, tz: "Europe/Paris" }, async () => {
            logger.info("Début reset limit money ..");

            UserRepository.resetMoneyLimit()
                .then(() => logger.info("..reset limit money ok"))
                .catch((err) =>
                    logger.error(`Erreur lors reset limit money ${err}`),
                );
        });
    },

    loadJobHelper(client) {
        logger.info(
            `-- Mise en place batch envoi money au @helper du discord CDS (s'il existe)`,
        );
        // 971508881165545544
        // tous les lundi, à 0h01
        scheduleJob(
            { dayOfWeek: 1, hour: 0, minute: 1, tz: "Europe/Paris" },
            async () => {
                for (const guild of client.guilds.cache.values()) {
                    logger.info(`.. recherche @Helper dans ${guild.name}..`);

                    guild.roles
                        // role Helper dans CDS seulement
                        .fetch("971508881165545544")
                        .then((roleHelper) => {
                            if (roleHelper?.members) {
                                const helpers = roleHelper.members
                                    .map((m) => m.toString())
                                    .join(", ");
                                roleHelper.members.each(async (member) => {
                                    const user = member.user;
                                    const userDb = await UserRepository.findByDiscordUser(user);

                                    // si dans bdd
                                    if (userDb) {
                                        logger.info(
                                            `.. On est lundi ! On donne 100 point à ${userDb.username}`,
                                        );
                                        await UserRepository.addMoney(user.id, 100)
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
        logger.info(`-- Mise en place batch 'écuyer'`);
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
                            // - prévenir user
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

    async startMonthlyClueJob(client, tz = "Europe/Paris") {
        try {
            logger.info("-- Mise en place batch indice mensuel pour la tour");
            // annule un job existant si présent
            if (scheduledJobs["monthly_clue"]) {
                scheduledJobs["monthly_clue"].cancel();
            }

            // charge les constantes (chemin relatif depuis `util/batch/batch.js`)
            const constants = require("../../data/event/tower/constants.json");

            // scheduleJob tous les jours pour s'assurer que le job 'monthly_clue' a bien été lancé sur le mois courant
            scheduleJob(
                "monthly_clue_check",
                { hour: 23, minute: 59, tz },
                async () => {
                    const monthIndex = moment().tz(tz).month(); // 0 = janvier
                    for (const guild of client.guilds.cache.values()) {
                        const tower = await TowerRepository.findByGuildIdAndStarted(guild.id);

                        if (!tower || tower.length === 0) {
                            continue;
                        }
                        if (tower.season === 0) {
                            continue;
                        }

                        if (tower.messageClue?.month === monthIndex) {
                            continue;
                        }

                        // relance le job monthly_clue
                        logger.info(
                            `-- relance du job monthly_clue pour ${guild.name}..`,
                        );
                        scheduledJobs["monthly_clue"].invoke();
                    }
                },
            );

            // scheduleJob tous les 1er du mois à 00:00
            scheduleJob(
                "monthly_clue",
                // '*/10 * * * * *', // pour test
                { date: 1, hour: 0, minute: 0, tz },
                async () => {
                    try {
                        const monthIndex = moment().tz(tz).month(); // 0 = janvier
                        const monthName = getMonthName(monthIndex);
                        const msgClue = await TowerRepository.findCurrentClue(monthIndex);
                        const clue = msgClue?.description ||  "Aucun indice disponible pour ce mois.";

                        const clueFields = await TowerRepository.findClueFields(msgClue.id);
                        const genres = clueFields?.filter(cf => cf.type === 'genre') || [];
                        const tags = clueFields?.filter(cf => cf.type === 'tag') || [];
                        const nbFields = genres.length + tags.length;

                        // envoi embed dans le salon event_tower de chaque guild
                        for (const guild of client.guilds.cache.values()) {
                            logger.info(
                                `.. création monthly_clue pour ${guild.name}..`,
                            );
                            const tower = await TowerRepository.findByGuildIdAndStarted(guild.id);
                            if (!tower) {
                                logger.info(
                                    `.. l'événement Tower n'a pas encore commencé pour ${guild.name}, on skip l'envoi de l'indice mensuel.`,
                                );
                                continue;
                            }
                            if (tower.season === 0) {
                                continue;
                            }

                            const guildConfig = await GuildConfigRepository.findByGuildId(guild.id);
                            const eventChannelId = guildConfig.channelEventTower;

                            const embed = new EmbedBuilder()
                                .setTitle(`🏷️ ${monthName}`)
                                .setDescription(clue)
                                .setColor(GREEN);

                            // ajout fields en fonction du nb de tag/genre
                            for (let i = 0; i < nbFields; i++) {
                                embed.addFields({
                                    name: "???",
                                    value: "???",
                                    inline: true,
                                });
                            }

                            const channel = await client.channels
                                .fetch(eventChannelId)
                                .catch(() => null);
                            if (channel && typeof channel.send === "function") {
                                const msg = await channel.send({
                                    embeds: [embed],
                                });

                                // si message existant, le unpin
                                if (
                                    tower?.messageClue?.idMsg
                                ) {
                                    const oldMsgId = tower.messageClue.idMsg;
                                    const oldMsg = await channel.messages
                                        .fetch(oldMsgId)
                                        .catch(() => null);
                                    if (oldMsg) {
                                        await oldMsg.unpin().catch(() => null);
                                    }
                                }

                                // pin le message
                                await msg.pin().catch(() => null);

                                // save id message pour edit fields plus tard
                                await TowerRepository.update(tower.id, {
                                    msgClueId: msgClue.id,
                                })
                                await TowerRepository.updateMessageClue(msgClue.id, {
                                    idMsg: msg.id
                                })
                                logger.info(
                                    `.. Embed mensuel envoyé pour le mois ${monthName}`,
                                );
                            } else {
                                logger.warn(
                                    "Salon introuvable pour l'envoi de l'indice mensuel.",
                                );
                            }
                        }
                    } catch (err) {
                        logger.error(
                            "Erreur lors de l'envoi de l'embed mensuel :",
                            err,
                        );
                    }
                },
            );
        } catch (err) {
            logger.error("Impossible de créer le job monthly_clue :", err);
        }
    },
};

function createGameLinks(appid) {
    const steamLink = `[Steam](https://steamcommunity.com/app/${appid})`;
    const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${appid})`;
    const shLink = `[SteamHunters](https://steamhunters.com/apps/${appid}/achievements)`;
    const cmeLink = `[Completionist](https://completionist.me/steam/app/${appid})`;

    return `${steamLink} | ${astatLink} | ${shLink} | ${cmeLink}`;
}
