const mongoose = require("mongoose");
const { User } = require("../models/index");

/**
 * Fonctions pour communiquer avec la base de données MongoDB
 * @param {*} client
 */
module.exports = (client) => {
    /* User */
    /**
     * @deprecated
     * Cherche et retourne un {@link User} avec un id Discord donné
     * @param {string} id Id Discord de l'user
     * @returns undefined si non trouvé, {@link User} sinon
     */
    client.findUserById = async (id) => {
        const data = await User.findOne({ userId: id });
        if (data) {
            return data;
        }
    };

    /**
     * @deprecated utilisé que dans profile.js
     * Cherche et retourne un {@link User} avec un utilisateur Discord donné
     * @param {string} user Utilisateur Discord à rechercher
     * @returns undefined si non trouvé, {@link User} sinon
     */
    client.getUser = async (user) => {
        return client.findUserById(user.id);
    };
};
