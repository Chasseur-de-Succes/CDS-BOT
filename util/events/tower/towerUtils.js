const { TowerBoss } = require("../../models");
const {
    PRIVATE_JOKES,
} = require("../../../data/event/tower/constants.json");

/**
 * Récupère une private joke aléatoire à partir de la liste définie dans les constantes
 * @returns {string}
 */
function getRandomPrivateJokes() {
    return PRIVATE_JOKES[Math.floor(Math.random() * PRIVATE_JOKES.length)];
}

/**
 * Affiche la barre de vie du boss avec des émojis colorés en fonction de son pourcentage de vie
 * @param boss Boss dont on veut afficher la vie (doit avoir les propriétés hp et maxHp)
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
 * @param season Numéro de la saison
 * @returns {Promise<*|boolean>} True si tous les boss sont morts, sinon false
 */
async function isAllBossDead(season) {
    switch (season) {
        case 0: // Saison 0 : 2 boss dont un caché
            return await TowerBoss.exists({
                $and: [
                    {
                        season: season,
                        hp: { $eq: 0 },
                        hidden: false,
                    },
                    {
                        season: season,
                        hp: { $eq: 0 },
                        hidden: true,
                    },
                ],
            });
        case 1: // Saison 1 : X boss TODO
        default:
            return false;
    }
}

/**
 * Termine la saison pour un utilisateur donné, sauvegarde les données de la saison dans l'historique et réinitialise les données pour la nouvelle saison
 * @param user Utilisateur dont on termine la saison
 * @param endDate Date de fin de la saison
 * @param seasonNumber Numéro de la saison à terminer
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

module.exports = {
    displayHealth,
    getRandomPrivateJokes,
    isAllBossDead,
    endSeasonForUser
}