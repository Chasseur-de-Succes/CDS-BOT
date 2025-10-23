const {
    createError,
    createEmbed,
    createLogs,
} = require("../../../util/envoiMsg");
const { ASCII_NOT_100 } = require("../../../data/event/tower/constants.json");
const { GuildConfig, User } = require("../../../models");
const { SALON } = require("../../../util/constants");
const { isAllBossDead } = require("../../../util/events/tower/towerUtils");
const { seasonZero } = require("../../../util/events/tower/season");

const validerJeu = async (interaction, options) => {
    const guildId = interaction.guildId;
    const guild = await GuildConfig.findOne({ guildId: guildId });
    let appid = options.getInteger("appid");
    appid = !appid ? options.get("jeu")?.value : appid;

    const author = interaction.member;
    const client = interaction.client;

    await interaction.deferReply();

    // Récupérer l'utilisateur
    const userDb = await client.getUser(author);
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
    const eventChannelId = await interaction.client.getGuildChannel(
        interaction.guild.id,
        SALON.EVENT_TOWER,
    );

    // Gestion d'erreur si aucun salon n'est défini
    if (!eventChannelId) {
        return interaction.editReply({
            content: `Aucun salon de l'évènement tower n'a été trouvé.`,
            ephemeral: true,
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
            ephemeral: true,
        });
    }

    // si la saison n'a pas encore commencé (à faire manuellement via commage '<préfix>tower start')
    if (!guild.event.tower.started) {
        logger.info(".. évènement tower pas encore commencé");
        return await interaction.editReply({
            embeds: [createError("L'évènement n'a pas encore commencé..")],
        });
    }

    // si pas inscrit
    if (typeof userDb.event.tower.startDate === "undefined") {
        return await interaction.editReply({
            embeds: [
                createError(
                    "Tu dois d'abord t'inscrire à l'évènement (via `/tower inscription`) !",
                ),
            ],
            ephemeral: true,
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
            ephemeral: true,
        });
    }

    const season = guild.event.tower.currentSeason;

    // teste si les boss sont en vie, sinon on skip
    const allBossDead = await isAllBossDead(season);

    if (allBossDead) {
        logger.info(".. tous les boss sont DEAD ..");
        return await interaction.editReply({
            content: "L'évènement est terminé ! Revenez peut être plus tard..",
            ephemeral: true,
        });
    }

    // récupération des infos des succès sur le jeu sélectionné via Steam
    const steamId = userDb.steamId;
    // TODO gestion erreur connexion ?
    const { error, gameName, hasAllAchievements, finishedAfterStart } =
        await client.hasAllAchievementsAfterDate(
            steamId,
            appid,
            guild.event.tower.startDate,
        );

    if (error) {
        logger.warn(
            `.. erreur lors de la recherche de succès pour l'appid ${appid} :\n${error}`,
        );
        // Recup nom du jeu, si présent dans la bdd
        const gameDb = await client.findGameByAppid(appid);
        // TODO si gameDb non trouvé
        return await interaction.editReply({
            content: `${gameDb?.name} (${appid}) n'a même pas de succès..`,
            ephemeral: true,
        });
    }

    // Vérifier si l'utilisateur a déjà 100% le jeu
    if (userDb.event.tower.completedGames.includes(appid)) {
        logger.warn({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): déjà fait ..`,
        });
        return await interaction.editReply({
            content: `Tu as déjà utilisé ${gameName}.. ce n'est pas très efficace.`,
            ephemeral: true,
        });
    }

    if (!finishedAfterStart) {
        logger.warn({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): avant le début de l'event ..`,
        });
        return await interaction.editReply({
            content: `Tu as terminé ${gameName} **avant** le début de l'évènement.. Celui-ci ne peut être pris en compte.`,
            ephemeral: true,
        });
    }

    if (hasAllAchievements) {
        userDb.event.tower.etage += 1; // On monte d'un étage
        userDb.event.tower.completedGames.push(appid); // Ajouter l'appId aux jeux déjà 100%
        await userDb.save();

        // logs
        await createLogs(
            client,
            guildId,
            `🗼 TOWER [${season}] : Nouveau jeu validé`,
            `${author} vient de valider **${gameName}** (${appid}) !`,
            "",
            "#DC8514",
        );

        // TODO fonctionnement différent en fonction de la saison
        // Saison 0 : Tour à 20 étages, avec 2 boss dont un caché
        switch (season) {
            case 0:
                // gestion de la saison 0 dans un fichier séparé
                return seasonZero(
                    client,
                    guild,
                    guildId,
                    interaction,
                    userDb,
                    author,
                    gameName,
                    appid,
                );
        }
        // TODO Saison N+1 : Tour à X étages, avec un boss à chaque palier (admin CDS)
        // TODO Saison N+2 : Participant réparti en plusieurs équipes (2 ou 3), 2/3 tour à X étages, un boss différent pour chaque équipe -> a réfléchir
    }

    return interaction.editReply({
        embeds: [
            await createEmbed({
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
        ephemeral: true,
    });
};

exports.validerJeu = validerJeu;
