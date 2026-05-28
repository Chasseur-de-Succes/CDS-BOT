const { TowerBoss, User } = require("../../../models");
const { PRIVATE_JOKES } = require("../../../data/event/tower/constants.json");
const { createLogs } = require("../../envoiMsg");
const { daysDiff } = require("../../util");
const { EmbedBuilder } = require("discord.js");
const { SALON } = require("../../constants");
const { MESSAGE } = require("../../../data/event/tower/constants.json");

/**
 * Récupère une private joke aléatoire à partir de la liste définie dans les constantes
 * @returns {string}
 */
function getRandomPrivateJokes() {
    return PRIVATE_JOKES[Math.floor(Math.random() * PRIVATE_JOKES.length)];
}

/**
 * Affiche la barre de vie du boss avec des émojis colorés en fonction de son pourcentage de vie
 * @param {{hp: number, maxHp: number}} boss - Boss dont on veut afficher la vie (doit avoir les propriétés hp et maxHp)
 * @returns {string} Chaîne d'émojis représentant la barre de vie
 */
function displayHealth(boss) {
    const totalHP = 5;
    const filledRatio = (boss.hp / boss.maxHp) * totalHP; // Ratio de cases pleines
    const filledHP = Math.floor(filledRatio); // Cases totalement remplies (arrondi inférieur)
    const hasIntermediate = filledRatio > filledHP; // Vérifie s'il reste une fraction pour une case intermédiaire
    const emptyHP = totalHP - filledHP - (hasIntermediate ? 1 : 0); // Cases vides

    // Sélection des émojis de couleur selon le ratio de vie
    let filledEmoji = "🟩"; // Par défaut, plein de vie
    if (boss.hp / boss.maxHp <= 0.3) {
        filledEmoji = "🟥"; // Faible santé
    } else if (boss.hp / boss.maxHp <= 0.6) {
        filledEmoji = "🟨"; // Santé moyenne
    }
    const intermediateEmoji = "🟧"; // Émoji intermédiaire
    const emptyEmoji = "⬜"; // Cases vides plus douces

    return `${filledEmoji.repeat(filledHP)}${
        hasIntermediate ? intermediateEmoji : ""
    }${emptyEmoji.repeat(emptyHP)}`;
}

/**
 * Vérifie si tous les boss d'une saison sont morts
 * Comportement actuel :
 *  - season = 0 : vérifie l'existence de boss avec hp > 0 (retourne true si aucun vivant).
 *  - autres saisons : retourne false (implémentation future possible).
 * @param {number} season Numéro de la saison
 * @returns {Promise<*|boolean>} True si tous les boss sont morts, sinon false
 */
async function isAllBossDead(season) {
    switch (season) {
        case 0: {
            // Saison 0 : 2 boss dont un caché
            // Check if there are any bosses in this season that are not dead
            const anyAlive = await TowerBoss.exists({
                season: season,
                hp: { $gt: 0 },
            });
            return !anyAlive;
        }
        case 1: // Saison 1 : X boss TODO
        default:
            return false;
    }
}

/**
 * Soigne le boss.
 *
 * @param {Object} boss - Towerboss.
 * @returns {Promise<void>}
 */
async function healBoss(boss) {
    const healAmount = 1; // on soigne que de 1 quand même
    boss.hp = Math.min(boss.maxHp, boss.hp + healAmount); // pas + haut que le bord
    await boss.save();
}

/**
 * Termine la saison pour un utilisateur donné, sauvegarde les données de la saison dans l'historique et réinitialise les données pour la nouvelle saison
 * @param {Object} user - Utilisateur dont on termine la saison
 * @param {number} endDate - Timestamp de fin de la saison
 * @param {number} seasonNumber - Numéro de la saison à terminer
 * @returns {Promise<void>}
 */
async function endSeasonForUser(user, endDate, seasonNumber) {
    // Sauvegarder les données de la saison actuelle dans l'historique
    user.event.tower.seasonHistory.push({
        seasonNumber: seasonNumber,
        startDate: user.event.tower.startDate,
        endDate: endDate,
        maxEtage: user.event.tower.etage,
        totalDamage: user.event.tower.totalDamage,
    });

    // Réinitialiser les données pour la nouvelle saison
    user.event.tower.startDate = undefined;
    user.event.tower.etage = 0;
    user.event.tower.totalDamage = 0;
    // user.completedGames = [];
    // user.season = seasonNumber + 1;

    await user.save();
}

/**
 * Fin de la saison, backup des infos
 * @param {Object} client - Instance du bot
 * @param {number} seasonNumber - Numéro de la saison à terminer
 * @param {Object} guild - Configuration de la guilde
 * @param {boolean} [cancelled=false] - Indique si la saison a été annulée
 */
async function endSeason(client, seasonNumber, guild, cancelled = false) {
    logger.info({
        prefix: "TOWER",
        message: `fin de la saison ${seasonNumber} ..`,
    });
    await createLogs(
        client,
        guild.guildId,
        !cancelled
            ? `🗼 TOWER : Saison ${seasonNumber} terminée`
            : `🗼 TOWER : Saison ${seasonNumber} arrêtée`,
        !cancelled ? "Évènement terminé !" : "Évènement arrêté !",
        `en ${daysDiff(guild.event.tower.startDate, Date.now())} jours`,
        "#DC8514",
    );

    // Edite Guild Config
    guild.event.tower.started = false;
    // on garde une trace
    guild.event.tower.history.push({
        season: guild.event.tower.currentSeason,
        startDate: guild.event.tower.startDate,
        endDate: Date.now(),
        finished: !cancelled,
    });
    await guild.save();

    // Récupérer tous les utilisateurs qui ont participé
    const users = await User.find({
        "event.tower.startDate": { $exists: true },
    });

    // Sauvegarder les informations de la saison actuelle pour chaque utilisateur
    const endDate = Date.now();
    for (const user of users) {
        await endSeasonForUser(user, endDate, seasonNumber);
    }

    // Envoi d'un message de fin
    if (cancelled) {
        const eventChannelId = await client.getGuildChannel(
            guild.guildId,
            SALON.EVENT_TOWER,
        );
        const eventChannel = client.channels.cache.get(eventChannelId);

        // si boss pas mort
        const embedEnd = new EmbedBuilder()
            .setTitle("Fin de l'évènement")
            // .setDescription(option.desc)
            .setColor("#ff0000")
            .setFooter({
                text: "Seuls ceux qui ne font rien n'échouent pas..",
            });

        let description = "";
        switch (seasonNumber) {
            case 0:
                description = await endSeasonZero();
                break;
            case 1:
                description = await endSeasonOne();
                break;
            default:
                break;
        }
        embedEnd.setDescription(description);

        eventChannel.send({ embeds: [embedEnd] });
    }
}

/* Description de fin de saison annulée */
async function endSeasonZero() {
    const currentBoss = await TowerBoss.findOne({ season: 0, hp: { $ne: 0 } });
    if (!currentBoss) return MESSAGE["0"].START_BAD_ENDING;

    return currentBoss.hidden
        ? MESSAGE["0"].SECOND_BAD_ENDING
        : MESSAGE["0"].FIRST_BAD_ENDING;
}
async function endSeasonOne() {
    const currentBoss = await TowerBoss.findOne({
        season: 1,
        hp: { $gt: 0 },
    });
    if (!currentBoss) return MESSAGE["1"].START_BAD_ENDING;

    return MESSAGE["1"].BAD_ENDING.replace(/\${boss}/g, currentBoss.name);
}

module.exports = {
    displayHealth,
    getRandomPrivateJokes,
    isAllBossDead,
    healBoss,
    endSeason,
};
