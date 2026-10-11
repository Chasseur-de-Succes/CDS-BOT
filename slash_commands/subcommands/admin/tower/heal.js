const { MessageFlags } = require("discord.js");
const { createError, createLogs, createEmbed } = require("../../../../util/envoiMsg");
const { NEW_SALON } = require("../../../../util/constants");
const {
    healBoss,
    displayHealth,
} = require("../../../../util/events/tower/towerUtils");
const { MESSAGE } = require("../../../../data/event/tower/constants.json");
const {
    GuildConfigRepository,
    UserRepository,
    TowerRepository,
    TowerStatsRepository,
} = require("../../../../repositories");

async function heal(interaction, options) {
    const guildId = interaction.guildId;
    let appid = options.getInteger("appid");
    appid = !appid ? options.get("jeu")?.value : appid;
    logger.info(`.. lancement heal event tower (${appid})`);

    const author = interaction.member;
    const client = interaction.client;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Récupération du channel de l'event
    const eventChannelId = await GuildConfigRepository.getChannel(
        guildId,
        NEW_SALON.EVENT_TOWER,
    );

    // Gestion d'erreur si aucun salon n'est défini
    if (!eventChannelId) {
        return interaction.editReply({
            content: `Aucun salon de l'évènement tower n'a été trouvé.`,
        });
    }

    // saison en cours (via la ligne Tower)
    const currentTower = await TowerRepository.findCurrentSeason(guildId);
    if (!currentTower || !currentTower.started) {
        logger.info(".. évènement tower pas encore commencé");
        return await interaction.editReply({
            embeds: [createError("L'évènement n'a pas encore commencé..")],
        });
    }
    const season = currentTower.season;

    // récup l'admin et test si register
    const adminDb = await UserRepository.findByDiscordUser(interaction.user);
    if (!adminDb) {
        return await interaction.editReply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    // si pas encore inscrit à l'évènement
    const adminStats = await TowerStatsRepository.findByUserAndSeason(
        adminDb,
        season,
    );
    if (!adminStats) {
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

    // recup boss courant (via la tour)
    const currentBoss = await TowerRepository.findAliveBoss(
        currentTower.id,
        season,
    );
    if (!currentBoss) {
        return interaction.editReply({
            content: "Aucun boss n'est actif actuellement. Heal impossible.",
        });
    }

    // récupération des infos des succès sur le jeu sélectionné via Steam
    const steamId = adminDb.steamId;

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
        currentTower.start,
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
    const hasCompleted = await TowerStatsRepository.hasCompletedGames(
        adminDb,
        season,
        appid,
    );
    if (hasCompleted) {
        logger.warn({
            prefix: "ADMIN TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): déjà fait ..`,
        });
        return await interaction.editReply({
            content: `Tu as déjà utilisé ${gameName}.. ce n'est pas très efficace.`,
        });
    }

    if (!hasAllAchievements) {
        return await interaction.editReply({
            content: `Tu n'as pas encore complété ${gameName}..`,
        });
    }

    if (!finishedAfterStart) {
        logger.warn({
            prefix: "ADMIN TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): avant le début de l'event ..`,
        });
        return await interaction.editReply({
            content: `Tu as terminé ${gameName} **avant** le début de l'évènement.. Celui-ci ne peut être pris en compte.`,
        });
    }

    // on peut heal !!
    await TowerStatsRepository.addCompletedGame(adminDb, season, appid);

    // heal le boss
    await healBoss(currentBoss);
    const descHeal = randomHealDesc();

    // logs
    await createLogs(
        client,
        guildId,
        `🗼 ADMIN TOWER [${season}] : Nouveau jeu validé`,
        `${author} vient de valider **${gameName}** (${appid}) ! Le boss se heal !`,
        "",
        "#DC8514",
    );

    const embed = createEmbed({
        title: "🛡️ Intervention d'un stalker",
        url: `https://store.steampowered.com/app/${appid}/`,
        desc: descHeal,
        color: "#00b7ff",
        footer: {
            text: `Le boss récupère des forces...`,
        },
    });
    embed.addFields({
        name: `${currentBoss.hp}/${currentBoss.maxHp}`,
        value: `${displayHealth(currentBoss)}`,
    });

    await client.channels.cache
        .get(eventChannelId)
        .send({ embeds: [embed] });
    return interaction.editReply("Ton jeu a bien soigné le boss !");
}

function randomHealDesc() {
    const heals = MESSAGE["1"].ADMIN_HEAL;
    return heals[Math.floor(Math.random() * heals.length)];
}

exports.heal = heal;
