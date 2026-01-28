const { GuildConfig, TowerBoss } = require("../../../../models");
const { SALON } = require("../../../../util/constants");
const {
    createError,
    createLogs,
    createEmbed,
} = require("../../../../util/envoiMsg");
const {
    healBoss,
    displayHealth,
} = require("../../../../util/events/tower/towerUtils");
const { MESSAGE } = require("../../../../data/event/tower/constants.json");

async function heal(interaction, options) {
    const guildId = interaction.guildId;
    const guild = await GuildConfig.findOne({ guildId: guildId });
    let appid = options.getInteger("appid");
    appid = !appid ? options.get("jeu")?.value : appid;
    logger.info(`.. lancement heal event tower (${appid})`);

    const author = interaction.member;
    const client = interaction.client;

    await interaction.deferReply({ ephemeral: true });
    const adminDb = await client.getUser(author);

    // TODO : vérifier que l'utilisateur est admin ou modérateur

    // Récupération du channel de l'event
    const eventChannelId = await interaction.client.getGuildChannel(
        interaction.guild.id,
        SALON.EVENT_TOWER,
    );

    // Gestion d'erreur si aucun salon n'est défini
    if (!eventChannelId) {
        return interaction.editReply({
            content: `Aucun salon de l'évènement tower n'a été trouvé.`,
        });
    }
    // si la saison n'a pas encore commencé
    if (!guild.event.tower.started) {
        logger.info(".. évènement tower pas encore commencé");
        return await interaction.editReply({
            embeds: [createError("L'évènement n'a pas encore commencé..")],
        });
    }

    // si pas encore inscrit
    if (typeof adminDb.event.tower.startDate === "undefined") {
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

    const season = guild.event.tower.currentSeason;

    // recup boss courant
    const currentBoss = await TowerBoss.findOne({
        season: season,
        hp: { $gt: 0 },
    });
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
        guild.event.tower.startDate,
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
    if (adminDb.event.tower.completedGames.includes(appid)) {
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
    if (hasAllAchievements) {
        adminDb.event.tower.completedGames.push(appid); // Ajouter l'appId aux jeux déjà 100%
        await adminDb.save();

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

    return await interaction.editReply({
        content: "Il faut d'abord terminer le jeu !",
    });
}

function randomHealDesc() {
    const heals = MESSAGE["1"].ADMIN_HEAL;
    return heals[Math.floor(Math.random() * heals.length)];
}

exports.heal = heal;
