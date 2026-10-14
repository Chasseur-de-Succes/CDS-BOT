const {
    createError,
    createEmbed,
    createLogs,
} = require("../../../util/envoiMsg");
const { ASCII_NOT_100 } = require("../../../data/event/tower/constants.json");
const { NEW_SALON } = require("../../../util/constants");
const { isAllBossDead } = require("../../../util/events/tower/towerUtils");
const { seasonOne } = require("../../../util/events/tower/season");
const { UserRepository, GuildConfigRepository, TowerRepository, TowerStatsRepository } = require("../../../repositories");
const { EmbedBuilder, MessageFlags } = require("discord.js");

const validerJeu = async (interaction, options) => {
    const guildId = interaction.guildId;
    let appid = options.getInteger("appid");
    appid = !appid ? options.get("jeu")?.value : appid;

    const author = interaction.member;
    const client = interaction.client;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Récupérer l'utilisateur
    const userDb = await UserRepository.findByDiscordUser(interaction.user);
    if (!userDb) {
        // Si pas dans la BDD
        return await interaction.editReply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    // Récupération du channel de l'event
    const eventChannelId = await GuildConfigRepository.getChannel(guildId, NEW_SALON.EVENT_TOWER);
    // Gestion d'erreur si aucun salon n'est défini
    if (!eventChannelId) {
        return interaction.editReply({
            content: `Aucun salon de l'évènement tower n'a été trouvé.`,
        });
    }

    // Test si le salon de l'interaction est celui de l'événement
    if (interaction.channelId !== eventChannelId) {
        return await interaction.editReply({
            embeds: [
                createError(
                    `Tu dois valider ton jeu dans le salon <#${eventChannelId}> !`,
                ),
            ],
        });
    }

    // si la saison n'a pas encore commencé (à faire manuellement via commande '<préfix>tower start')
    const currentTower = await TowerRepository.findCurrentSeason(guildId);
    const season = currentTower.season;
    if (typeof season === "undefined") {
        logger.info(".. évènement tower pas encore commencé");
        return await interaction.editReply({
            embeds: [createError("L'évènement n'a pas encore commencé..")],
        });
    }

    // si pas encore inscrit
    const userFound = await TowerStatsRepository.hasUserAndSeason(userDb, season);
    if (!userFound) {
        return await interaction.editReply({
            embeds: [
                createError(
                    "Tu dois d'abord t'inscrire à l'évènement (via `/tower inscription`) !",
                ),
            ],
        });
    }

    // appid doit être tjs présent
    if (!appid) {
        return await interaction.editReply({
            embeds: [
                createError(
                    "Tu dois spécifier au moins un appID ou chercher le jeu que tu as complété",
                ),
            ],
        });
    }

    // teste si les boss sont en vie, sinon on skip
    const allBossDead = await isAllBossDead(season);

    if (allBossDead) {
        logger.info(".. tous les boss sont DEAD ..");
        return await interaction.editReply({
            content: "L'évènement est terminé ! Revenez peut être plus tard..",
        });
    }

    // récupération des infos des succès sur le jeu sélectionné via Steam
    const steamId = userDb.steamId;
    // TODO gestion erreur connexion ?
    const {
        error,
        noAchievements,
        gameName,
        hasAllAchievements,
        firstUnlock,
        finishedAfterStart,
    } = await client.hasAllAchievementsAfterDate(
        steamId,
        appid,
        currentTower.started,
    );

    if (error) {
        logger.warn(
            `.. erreur lors de la recherche de succès pour l'appid ${appid} :\n${error}`,
        );
        // Recup nom du jeu, si présent dans la bdd
        return await interaction.editReply({
            content: `${gameName} (${appid}) n'est pas dans ta bibliothèque ou n'a pas de succès..`,
        });
    }

    if (noAchievements) {
        logger.warn(`.. ${error}`);
        // Recup nom du jeu, si présent dans la bdd
        return await interaction.editReply({
            content: `${gameName} (${appid}) n'a même pas de succès..`,
        });
    }

    // Vérifier si l'utilisateur a déjà 100% le jeu
    const hasCompleted = await TowerStatsRepository.hasCompletedGames(userDb, season, appid);
    if (hasCompleted) {
        logger.warn({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): déjà fait ..`,
        });
        return await interaction.editReply({
            content: `Tu as déjà utilisé ${gameName}.. ce n'est pas très efficace.`,
        });
    }

    if (!hasAllAchievements) {
        return interaction.editReply({
            embeds: [
                createEmbed({
                    title: `🛑 Tu n'as pas encore complété ${gameName}..`,
                    url: `https://store.steampowered.com/app/${appid}/`,
                    desc: `Il semblerait que tu n'es pas eu tous les succès de **${gameName}**..
${ASCII_NOT_100}`,
                    color: "#0019ff",
                    footer: {
                        text: "C'est une erreur ? Oups.. contacte un admin !",
                    },
                }),
            ],
        });
    }

    if (!finishedAfterStart) {
        logger.warn({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): avant le début de l'event ..`,
        });
        return await interaction.editReply({
            content: `Tu as terminé ${gameName} **avant** le début de l'évènement.. Celui-ci ne peut être pris en compte.`,
        });
    }

    if (hasAllAchievements) {
        await TowerStatsRepository.completeGames(userDb, season, appid);

        // logs
        await createLogs(
            client,
            guildId,
            `🗼 TOWER [${season}] : Nouveau jeu validé`,
            `${author} vient de valider **${gameName}** (${appid}) !`,
            "",
            "#DC8514",
        );

        // fonctionnement différent en fonction de la saison
        switch (season) {
            // Saison 0 : Tour à 20 étages, avec 2 boss dont un caché
            case 0:
                // obsolète suite au passage vers PostGre, saison déjà passé donc on a skip
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle("🏆 Saison 0")
                        .setDescription("Cette saison ne fonctionne plus actuellement !")
                        .setColor("#ff0000")],
                    flags: MessageFlags.Ephemeral,
                });
            // Saison 1 : Tour à 4 paliers, avec un boss à chaque palier (admin CDS)
            case 1:
                return seasonOne(
                    client,
                    guildId,
                    interaction,
                    userDb,
                    author,
                    gameName,
                    appid,
                    firstUnlock,
                );
        }
        // TODO Saison N+2 : Participant réparti en plusieurs équipes (2 ou 3), 2/3 tour à X étages, un boss différent pour chaque équipe -> a réfléchir
    }

    // TODO a revoir
    return interaction.editReply({
        embeds: [
            createEmbed({
                title: `🛑 Tu n'as pas encore complété ${gameName}..`,
                url: `https://store.steampowered.com/app/${appid}/`,
                desc: `Il semblerait que tu n'es pas eu tous les succès de **${gameName}**..
${ASCII_NOT_100}`,
                color: "#0019ff",
                footer: {
                    text: "C'est une erreur ? Oups.. contacte un admin !",
                },
            }),
        ],
    });
};

exports.validerJeu = validerJeu;
