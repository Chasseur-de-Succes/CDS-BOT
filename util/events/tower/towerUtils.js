const { TowerBoss } = require("../../../models");
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

/**
 * Fin de la saison, backup des infos
 */
async function endSeason(client, seasonNumber, guild, cancelled = false) {
    logger.info({
        prefix: "TOWER",
        message: `fin de la saison ${seasonNumber} ..`,
    });
    createLogs(
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
        // si on arrête l'event manuellement, un boss est forcément encore en vie
        const currentBoss = await TowerBoss.findOne({
            season: seasonNumber,
            hp: { $ne: 0 },
        });

        const eventChannelId = await client.getGuildChannel(
            guild.guildId,
            SALON.EVENT_TOWER,
        );
        const eventChannel = client.channels.cache.get(eventChannelId);

        // si boss pas mort
        let embedEnd = new EmbedBuilder()
            .setTitle("Fin de l'évènement")
            // .setDescription(option.desc)
            .setColor("#ff0000")
            .setFooter({
                text: "Seuls ceux qui ne font rien n'échouent pas..",
            });

        if (currentBoss && currentBoss.hp > 0) {
            // si le boss est le boss caché
            if (currentBoss.hidden) {
                const deadBoss = await TowerBoss.findOne({
                    season: seasonNumber,
                    hidden: false,
                });
                embedEnd.setDescription(
                    `
Malgré tous vos efforts communs, vous n'avez pas réussi à vaincre \`${currentBoss.name}\`..
En prenant le corps de \`${deadBoss.name}\`, \`${currentBoss.name}\` éjecte tout le monde de la tour.
Il s'enfuit, furieux de ne pas avoir pu venger son maître..
${ASCII_SECOND_BAD_ENDING}`,
                );
            } else {
                embedEnd.setDescription(
                    `Malgré tous vos efforts communs, vous n'avez pas réussi à vaincre \`${currentBoss.name}\`..
Celui-ci éjecte tout le monde de la tour, et vous le voyez s'enfuir au loin, suivi de près par une ombre..
${ASCII_FIRST_BAD_ENDING}`,
                );
            }
        } else {
            embedEnd.setDescription(
                `Vous tournez en rond dans la tour, mais personne n'arrive à trouver le sommet..
${ASCII_START_BAD_ENDING}`,
            );
        }
        eventChannel.send({ embeds: [embedEnd] });
    }
}

module.exports = {
    displayHealth,
    getRandomPrivateJokes,
    isAllBossDead,
    endSeasonForUser,
    endSeason
}