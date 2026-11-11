const { PRIVATE_JOKES } = require("../../../data/event/tower/constants.json");
const { createLogs } = require("../../envoiMsg");
const { daysDiff } = require("../../util");
const { EmbedBuilder } = require("discord.js");
const { NEW_SALON } = require("../../constants");
const { MESSAGE } = require("../../../data/event/tower/constants.json");
const {
    TowerRepository,
    GuildConfigRepository,
} = require("../../../repositories");

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
        case 0:
        case 1:
            return await TowerRepository.isAllBossDead(season);
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
    await boss.$query().patch({ hp: boss.hp });
}

/**
 * Fin de la saison : clôture la tour en cours et (si annulée) affiche un message de fin.
 * Les données par joueur sont déjà persistées dans `TowerStats` (une ligne par saison),
 * il n'y a donc plus de backup/reset à faire côté utilisateur.
 * @param {Object} client - Instance du bot
 * @param {number} seasonNumber - Numéro de la saison à terminer
 * @param {string} guildId - Id de la guilde
 * @param {boolean} [cancelled=false] - Indique si la saison a été annulée
 */
async function endSeason(client, seasonNumber, guildId, cancelled = false) {
    logger.info({
        prefix: "TOWER",
        message: `fin de la saison ${seasonNumber} ..`,
    });

    const tower = await TowerRepository.findByGuildIdAndSeason(
        guildId,
        seasonNumber,
    );

    await createLogs(
        client,
        guildId,
        !cancelled
            ? `🗼 TOWER : Saison ${seasonNumber} terminée`
            : `🗼 TOWER : Saison ${seasonNumber} arrêtée`,
        !cancelled ? "Évènement terminé !" : "Évènement arrêté !",
        tower ? `en ${daysDiff(tower.start, Date.now())} jours` : "",
        "#DC8514",
    );

    // clôture la tour en cours
    if (tower) {
        await TowerRepository.update(tower.id, {
            started: false,
            finished: !cancelled,
            finish: new Date(),
        });
    }

    // Envoi d'un message de fin (uniquement si annulée)
    if (cancelled) {
        const eventChannelId = await GuildConfigRepository.getChannel(
            guildId,
            NEW_SALON.EVENT_TOWER,
        );
        const eventChannel = client.channels.cache.get(eventChannelId);

        // si boss pas mort
        const embedEnd = new EmbedBuilder()
            .setTitle("Fin de l'évènement")
            .setColor("#ff0000")
            .setFooter({
                text: "Seuls ceux qui ne font rien n'échouent pas..",
            });

        let description = "";
        switch (seasonNumber) {
            case 0:
                description = await endSeasonZero(tower?.id);
                break;
            case 1:
                description = await endSeasonOne(tower?.id);
                break;
            default:
                break;
        }
        embedEnd.setDescription(description);

        if (eventChannel) {
            eventChannel.send({ embeds: [embedEnd] });
        }
    }
}

/* Description de fin de saison annulée */
async function endSeasonZero(towerId) {
    const currentBoss = towerId
        ? await TowerRepository.findAliveBoss(towerId, 0)
        : await TowerRepository.findAliveBossBySeason(0);
    if (!currentBoss) return MESSAGE["0"].START_BAD_ENDING;

    return currentBoss.hidden
        ? MESSAGE["0"].SECOND_BAD_ENDING
        : MESSAGE["0"].FIRST_BAD_ENDING;
}
async function endSeasonOne(towerId) {
    const currentBoss = towerId
        ? await TowerRepository.findAliveBoss(towerId, 1)
        : await TowerRepository.findAliveBossBySeason(1);
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
