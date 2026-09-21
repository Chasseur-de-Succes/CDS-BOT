const mongoose = require("mongoose");
const {
    User,
    Group,
    Game,
    Job,
    GuildConfig,
    GameItem,
    RolesChannel,
    MsgHallHeros,
    MsgHallZeros,
    MsgDmdeAide,
} = require("../models/index");
const { escapeRegExp } = require("./util");

/**
 * Fonctions pour communiquer avec la base de données MongoDB
 * @param {*} client
 */
module.exports = (client) => {
    /* General */
    /**
     * Mets à jour un élément data avec les paramètres settings
     * @param {Object} data l'élément à mettre à jour
     * @param {Object} settings le(s) paramètre(s) à modifier (format JSON {...})
     * @returns {Promise<any>} https://docs.mongodb.com/manual/reference/method/db.collection.updateOne/#returns
     */
    client.update = async (data, settings) => {
        if (typeof data !== "object") {
            data = {};
        }
        for (const key in settings) {
            if (data[key] !== settings[key]) {
                data[key] = settings[key];
            }
        }
        return data.updateOne(settings);
    };

    /* User */
    /**
     * Cherche et retourne un {@link User} avec un id Discord donné
     * @param {string} id Id Discord de l'user
     * @returns undefined si non trouvé, {@link User} sinon
     */
    // TODO utilisé dans group.js mais faut d'abord migré group
    client.findUserById = async (id) => {
        const data = await User.findOne({ userId: id });
        if (data) {
            return data;
        }
    };

    /**
     * Cherche et retourne un {@link User} avec un utilisateur Discord donné
     * @param {string} user Utilisateur Discord à rechercher
     * @returns undefined si non trouvé, {@link User} sinon
     */
    client.getUser = async (user) => {
        return client.findUserById(user.id);
    };

    /* Guild ? Créer d'autres fichiers de fonctions ? */

    /* Group */
    /**
     * Supprime un groupe
     * @param {Object} group
     */
    client.deleteGroup = async (group) => {
        // TODO return ? callback ?
        Group.deleteOne({ _id: group._id }).then((grp) =>
            logger.info({
                prefix: "[DB]",
                message: `Delete groupe : ${group.name}`,
            }),
        );
    };

    /**
     * Cherche et retourne un {@link Group} avec une requête donné
     * @param {Object} query Requête Mongodb
     * @returns undefined si non trouvé, {@link Group} sinon
     */
    client.findGroup = async (query) => {
        const data = await Group.find(query).populate("captain members game");
        if (data) {
            return data;
        }
    };

    /**
     * Cherche et retourne un {@link Group} avec un id donné,
     * en récupérant les infos liés (capitaine, membres et jeu)
     * @param {Object} id Id du groupe
     * @returns undefined si non trouvé, {@link Group} sinon
     */
    client.findGroupById = async (id) => {
        return Group.findById(id).populate("captain members game");
    };

    /**
     * Cherche et retourne un {@link Group}, qui n'est pas validé et dont le {@link User} donné est
     * soit le capitaine, soit membre du groupe
     * en récupérant les infos liés (capitaine, membres et jeu)
     * @param {Object} userDB {@link User} du groupe
     * @returns undefined si non trouvé, tableau de {@link Group} sinon
     */
    client.findGroupByUser = async (userDb) => {
        const data = await Group.find({
            $and: [
                { validated: false },
                { $or: [{ captain: userDb }, { members: userDb }] },
            ],
        }).populate("captain members game");
        if (data) {
            return data;
        }
    };

    /**
     * Cherche et retourne un {@link Group}, qui n'est pas validé et dont le nom donné correspond
     * en récupérant les infos liés (capitaine, membres et jeu)
     * @param {String} name Nom du groupe
     * @returns undefined si non trouvé, {@link Group} sinon
     */
    client.findGroupByName = async (name) => {
        const data = await Group.findOne({
            $and: [{ validated: false }, { name: name }],
        }).populate("captain members game");
        if (data) {
            return data;
        }
    };

    /* GAMES */
    /**
     * Cherche et retourne un {@link Game} en fonction de son Steam App Id
     * @param {String} appid AppId du jeu
     * @returns undefined si non trouvé, tableau de {@link Game} sinon
     */
    client.findGameByAppid = async (appid) => {
        const data = await Game.findOne({ appid: appid });
        if (data) {
            return data;
        }
    };

    /**
     * Cherche et retourne un {@link Game} en fonction de son nom (via Regex /name/i)
     * @param {String} name Nom du jeu
     * @returns undefined si non trouvé, tableau de {@link Game} sinon
     */
    client.findGamesByName = async (name) => {
        return client.findGames({ name: new RegExp(name, "i") });
    };

    /**
     * Cherche et retourne un {@link Game} en fonction d'une requête Mongodb
     * @param {Object} query Requête
     * @returns undefined si non trouvé, tableau de {@link Game} sinon
     */
    client.findGames = async (query) => {
        const data = await Game.find(query);
        // .populate('');
        if (data) {
            return data;
        }
    };

    /* GUILD CONFIG */
    /**
     * Cherche et retourne un {@link GuildConfig} en fonction de l'id de la guild (serveur)
     * @param {String} guildId Id du serveur
     * @returns undefined si non trouvé, {@link GuildConfig} sinon
     */
    client.findGuildById = async (guildId) => {
        const data = await GuildConfig.findOne({ guildId: guildId });
        if (data) {
            return data;
        }
    };

    /**
     * Créer un nouveau {@link GuildConfig} et le sauvegarde en base
     * @param {Object} guild Config serveur à sauvegarder
     * @returns
     */
    client.createGuild = async (guild) => {
        const merged = Object.assign({ _id: mongoose.Types.ObjectId() }, guild);
        const createGuild = await new GuildConfig(merged);
        const gld = await createGuild.save();
        logger.info({
            prefix: "[DB]",
            message: `Nouvelle guild : ${gld.guildId}`,
        });
        return gld;
    };

    /**
     * Cherche et retourne un tableau de {@link GuildConfig} en fonction d'une requête Mongodb
     * @param {Object} query Requête
     * @returns undefined si non trouvé, tableau {@link GuildConfig} sinon
     */
    client.findGuildConfig = async (query) => {
        const data = await GuildConfig.find(query);
        if (data) {
            return data;
        }
    };

    /* JOB */
    /**
     * Créer un nouveau {@link Job} et le sauvegarde en base
     * @param {Object} job Job à sauvegarder
     * @returns
     */
    client.createJob = async (job) => {
        const merged = Object.assign({ _id: mongoose.Types.ObjectId() }, job);
        const createJob = await new Job(merged);
        const j = await createJob.save();
        logger.info({ prefix: "[DB]", message: "Nouveau job.." });
        return j;
    };

    /**
     * Supprime un groupe
     * @param {Object} group
     */
    client.deleteJob = async (job) => {
        // TODO return ? callback ?
        Job.deleteOne({ _id: job._id }).then((j) =>
            logger.info({
                prefix: "[DB]",
                message: `Delete job : ${job.name}`,
            }),
        );
    };

    /**
     * Cherche et retourne un tableau de {@link Job} en fonction d'une requête Mongodb
     * @param {Object} query Requête
     * @returns undefined si non trouvé, tableau {@link Job} sinon
     */
    client.findJob = async (query) => {
        const data = await Job.find(query);
        // .populate('');
        if (data) {
            return data;
        }
    };

    client.updateJob = async (job, settings) => {
        let data = job;
        if (typeof data !== "object") {
            data = {};
        }
        for (const key in settings) {
            if (data[key] !== settings[key]) data[key] = settings[key];
        }
        return data.updateOne(settings);
    };

    /* SHOP */
    client.createGameItemShop = async (item) => {
        const merged = Object.assign({ _id: mongoose.Types.ObjectId() }, item);
        const createGameItem = await new GameItem(merged);
        const g = await createGameItem.save();

        logger.info({
            prefix: "[DB]",
            message: `Nouveau Game Item (shop) : ${item.game.name}`,
        });
        return g;
    };

    /**
     * Supprime un jeu du shop
     * @param {Object} gameItem
     */
    client.deleteGameItem = async (gameItem) => {
        // TODO return ? callback ?
        await GameItem.deleteOne({ _id: gameItem._id });
        logger.info({ prefix: "[DB]", message: "Delete game item" });
    };
    /**
     * Supprime un jeu du shop
     * @param {Object} id
     */
    client.deleteGameItemById = async (id) => {
        await GameItem.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
        });
        logger.info({ prefix: "[DB]", message: "Delete game item" });
    };

    client.findGameItemShop = async (query) => {
        const data = await GameItem.find(query).populate("game seller buyer");
        if (data) {
            return data;
        }
    };

    client.findGameItemShopBy = async (q) => {
        const agg = [
            {
                // select GameItem
                $match: { itemtype: "GameItem" },
            },
            {
                // recup info Game
                $lookup: {
                    from: "games",
                    localField: "game",
                    foreignField: "_id",
                    as: "game",
                },
            },
            {
                // recup info vendeur
                $lookup: {
                    from: "users",
                    localField: "seller",
                    foreignField: "_id",
                    as: "seller",
                },
            },
            {
                // transforme array en Game
                $unwind: {
                    path: "$game",
                },
            },
            {
                // transforme array en User
                $unwind: {
                    path: "$seller",
                },
            },
        ];

        // jeux pas encore vendu
        if (q.notSold) {
            agg.push({ $match: { buyer: { $exists: false } } });
        }

        // filtre sur nom jeu
        if (q.game) {
            agg.push({
                $match: { "game.name": RegExp(escapeRegExp(q.game), "i") },
            });
        }
        // filtre sur vendeur (ID)
        if (q.seller) {
            agg.push({ $match: { "seller.userId": RegExp(q.seller, "i") } });
        }

        // limit résultat
        if (q.limit) {
            agg.push({ $limit: q.limit });
        }

        const data = await GameItem.aggregate(agg);
        if (data) {
            return data;
        }
    };

    client.findGameItemShopByGame = async (query) => {
        const agg = [
            {
                // select GameItem
                $match: { itemtype: "GameItem" },
            },
            {
                // jeux pas encore vendu
                $match: { buyer: { $exists: false } },
            },
            {
                // recup info Game
                $lookup: {
                    from: "games",
                    localField: "game",
                    foreignField: "_id",
                    as: "game",
                },
            },
            {
                // recup info vendeur
                $lookup: {
                    from: "users",
                    localField: "seller",
                    foreignField: "_id",
                    as: "seller",
                },
            },
            {
                // transforme array en Game
                $unwind: { path: "$game" },
            },
            {
                // transforme array en User
                $unwind: { path: "$seller" },
            },
            {
                // sort par montant
                $sort: {
                    montant: 1,
                },
            },
            {
                // regroupe par jeu
                $group: {
                    _id: "$game",
                    items: {
                        $push: "$$ROOT",
                    },
                },
            },
            {
                // TODO obligé de sort pour avoir le meme ordre, pour pouvoir acceder à la bonne page
                // sort par appid
                $sort: {
                    "_id.appid": 1,
                },
            },
        ];

        const data = await GameItem.aggregate(agg);
        if (data) {
            return data;
        }
    };

    /* ROLE CHANNEL */
    client.createRoleChannel = async (item) => {
        const merged = Object.assign({ _id: mongoose.Types.ObjectId() }, item);
        const createRole = await new RolesChannel(merged);
        const g = await createRole.save();

        logger.info({
            prefix: "[DB]",
            message: `Nouveau Role Channel : ${item.name}`,
        });
        return g;
    };

    /* MSG */
    client.createMsgHallHeros = async (item) => {
        const merged = Object.assign({ _id: mongoose.Types.ObjectId() }, item);
        const createMsg = await new MsgHallHeros(merged);
        const g = await createMsg.save();

        logger.info({
            prefix: "[DB]",
            message: `Nouveau Hall 🏆 Héros, de : ${item.author.username}`,
        });
        return g;
    };

    client.createMsgHallZeros = async (item) => {
        const merged = Object.assign({ _id: mongoose.Types.ObjectId() }, item);
        const createMsg = await new MsgHallZeros(merged);
        const g = await createMsg.save();

        logger.info({
            prefix: "[DB]",
            message: `Nouveau Hall 💩 Zéros, de : ${item.author.username}`,
        });
        return g;
    };
    client.createMsgDmdeAide = async (item) => {
        const merged = Object.assign({ _id: mongoose.Types.ObjectId() }, item);
        const createMsg = await new MsgDmdeAide(merged);
        const g = await createMsg.save();

        logger.info({ prefix: "[DB]", message: "Nouveau msg 🤝 Dmde aide" });
        return g;
    };

    // TODO a deplacer
    client.getGuildChannel = async (id, salon) => {
        const guildDb = await client.findGuildById(id);
        return guildDb?.channels[salon];
    };

    // config profile
    client.getOrInitProfile = async (user) => {
        const configProfile = user.profile;
        let toSave = false;

        if (!configProfile.text) {
            configProfile.text = new Map();
            configProfile.text.set("#FFFFFF", true);
            toSave = true;
        }

        if (!configProfile.border.style || !configProfile.border.color) {
            configProfile.border.style = new Map();
            configProfile.border.style.set("solid", true);

            configProfile.border.color = new Map();
            configProfile.border.color.set("#FFFFFF", true);
            toSave = true;
        }

        if (!configProfile.avatar.style || !configProfile.avatar.color) {
            configProfile.avatar.style = new Map();
            configProfile.avatar.style.set("solid", true);

            configProfile.avatar.color = new Map();
            configProfile.avatar.color.set("#FFFFFF", true);
            toSave = true;
        }

        if (!configProfile.background.color) {
            configProfile.background.color = new Map();
            configProfile.background.color.set("#000000", true);
            toSave = true;
        }

        if (toSave) {
            await user.save();
        }

        return configProfile;
    };

    client.getNbOngoingGroups = async (userid) => {
        const tmp = await User.findOne({ userId: userid });

        return Group.find({
            members: tmp,
            validated: false,
        }).countDocuments();
    };
};
