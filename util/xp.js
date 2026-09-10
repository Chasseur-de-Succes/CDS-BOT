const { UserRepository } = require("../repositories");
const { THREESOLD_LVL } = require("./constants.js");
const { feedBotLevelUp } = require("./envoiMsg.js");

/**
 * Ajoute de l'xp à un utilisateur
 * @param {*} client
 * @param guildId
 * @param {*} user User Discord
 * @param {*} xp montant de l'xp à donner
 */
module.exports.addXp = async (client, guildId, user, xp) => {
    const userDb = await UserRepository.findByDiscordId(user.id);

    // si utilisateur trouvé
    if (userDb) {
        const crtLvl = userDb.level;
        const crtXp = userDb.xp;

        await UserRepository.addXp(userDb.id, xp);

        if (crtLvl === 0) {
            // nivo 1 direct, au cas où
            await UserRepository.incrementLevel(userDb.id);
        } else {
            const palier = this.getXpNeededForNextLevel(crtLvl);

            if (crtXp + xp >= palier) {
                // youpi niveau sup.
                await UserRepository.incrementLevel(userDb.id);

                // nourri feed bot
                feedBotLevelUp(
                    client,
                    guildId,
                    user,
                    { ...userDb, experience: crtXp + xp },
                    this.getXpNeededForNextLevel(crtLvl + 1),
                );
            }
        }
    }
};

/**
 * Retourne le nb d'exp nécessaire pour passer au niveau +1 donné
 * Exemple, si le param. est 2, cela retournera l'exp. pour aller au niveau 3
 * @param {Number} lvl le niveau
 * @returns le nb d'exp
 */
module.exports.getXpNeededForNextLevel = (lvl) => {
    if (lvl === 1) {
        return 100;
    }

    return this.getXpNeededForNextLevel(lvl - 1) + THREESOLD_LVL * (lvl - 1);
};
