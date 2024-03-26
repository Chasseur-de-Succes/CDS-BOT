const { User } = require("../models/index.js");
const { THREESOLD_LVL } = require("./constants.js");
const { feedBotLevelUp } = require("./envoiMsg.js");

/**
 * Ajoute de l'xp à un utilisateur
 * @param {*} client
 * @param {*} user User Discord
 * @param {*} xp montant de l'xp à donner
 */
module.exports.addXp = async (client, guildId, user, xp) => {
    const userDB = await User.findOneAndUpdate(
        { userId: user.id },
        { $inc: { experience: xp } },
        { new: true },
    ).exec();

    // si update ok
    if (userDB) {
        const crtLvl = userDB.level;

        if (crtLvl === 0) {
            // nivo 1 direct, au cas où
            await User.updateOne({ userId: user.id }, { $inc: { level: 1 } });
        } else {
            const palier = this.getXpNeededForNextLevel(crtLvl);

            if (userDB.experience >= palier) {
                // youpi niveau sup.
                await User.updateOne(
                    { userId: user.id },
                    { $inc: { level: 1 } },
                );

                // nourri feed bot
                feedBotLevelUp(
                    client,
                    guildId,
                    user,
                    userDB,
                    this.getXpNeededForNextLevel(userDB.level + 1),
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
    if (lvl === 1) return 100;

    return this.getXpNeededForNextLevel(lvl - 1) + THREESOLD_LVL * (lvl - 1);
};
