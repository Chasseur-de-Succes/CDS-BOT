const mongoose = require("mongoose");
const { User, Group, Game, Job, GuildConfig, GameItem } = require("../models/index");

/**
 * Fonctions pour communiquer avec la base de données MongoDB
 * @param {*} client 
 */
module.exports = client => {
    /* General */
    /**
     * Mets à jour un élément data avec les paramètres settings
     * @param {Object} data l'élément à mettre à jour
     * @param {Object} settings le(s) paramètre(s) à modifier (format JSON {...})
     * @returns https://docs.mongodb.com/manual/reference/method/db.collection.updateOne/#returns
     */
    client.update = async (data, settings) => {
        if (typeof data !== "object") data = {};
        for (const key in settings) {
            if(data[key] !== settings[key]) data[key] = settings[key];
        }
        return data.updateOne(settings);
    };
    
    /* User */
    /**
     * Créer un nouvel {@link User} et le sauvegarde en base
     * @param {Object} user Utilisateur à sauvegarder
     * @returns 
     */
    client.createUser = async user => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, user);
        const createUser = await new User(merged);
        const usr = await createUser.save();
        logger.info({prefix:"[DB]", message:"Nouvel utilisateur : " + usr.username});
        return usr;
    };
    
    /**
     * Cherche et retourne un {@link User} avec un id Discord donné
     * @param {string} id Id Discord de l'user
     * @returns undefined si non trouvé, {@link User} sinon
     */
    client.findUserById = async id => {
        const data = await User.findOne({userId: id});
        if (data) return data;
        else return;
    };

    /**
     * Cherche et retourne un {@link User} avec un utilisateur Discord donné
     * @param {string} user Utilisateur Discord à rechercher
     * @returns undefined si non trouvé, {@link User} sinon
     */
    client.getUser = async user => {
        return client.findUserById(user.id);
    };

    /* Guild ? Créer d'autres fichiers de fonctions ? */

    /* Group */
    /**
     * Créer un nouveau {@link Group} et le sauvegarde en base
     * @param {Object} group Groupe à sauvegarder
     * @returns 
     */
    client.createGroup = async group => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, group);
        const createGroup = await new Group(merged);
        let grp = await createGroup.save()
        await grp.populate('captain members').execPopulate()
        logger.info({prefix:"[DB]", message:"Nouvel groupe : " + grp.name});
        return grp;
    };

    /**
     * Supprime un groupe
     * @param {Object} group 
     */
    client.deleteGroup = async group => {
        // TODO return ? callback ?
        Group.deleteOne({ _id: group._id }).then(grp => logger.info({prefix:"[DB]", message:"Delete groupe : " + groupe.name}));
    }

    /**
     * Cherche et retourne un {@link Group} avec une requête donné
     * @param {Object} query Requête Mongodb
     * @returns undefined si non trouvé, {@link Group} sinon
     */
    client.findGroup = async query => {
        const data = await Group.find(query)
                                .populate('captain members game');
        if (data) return data;
        else return;
    }

    /**
     * Cherche et retourne un {@link Group} avec un id donné, 
     * en récupérant les infos liés (capitaine, membres et jeu)
     * @param {Object} id Id du groupe
     * @returns undefined si non trouvé, {@link Group} sinon
     */
    client.findGroupById = async id => {
        return Group.findById(id)
            .populate('captain members game');
    };

    /**
     * Cherche et retourne un {@link Group}, qui n'est pas validé et dont le {@link User} donné est
     * soit le capitaine, soit membre du groupe
     * en récupérant les infos liés (capitaine, membres et jeu)
     * @param {Object} userDB {@link User} du groupe
     * @returns undefined si non trouvé, tableau de {@link Group} sinon
     */
    client.findGroupByUser = async userDB => {
        const data = await Group.find({
            $and: [
                { validated: false },
                { $or: [
                    { captain: userDB },
                    { members: userDB },
                ] }
            ]
        })
            .populate('captain members game');
        if (data) return data;
        else return;
    };

    /**
     * Cherche et retourne un {@link Group}, qui n'est pas validé et dont le nom donné correspond
     * en récupérant les infos liés (capitaine, membres et jeu)
     * @param {String} name Nom du groupe
     * @returns undefined si non trouvé, {@link Group} sinon
     */
    client.findGroupByName = async name => {
        const data = await Group.findOne({
            $and: [
                { validated: false },
                { name: name }
            ]
        })
            .populate('captain members game');
        if (data) return data;
        else return;
    };
    
    /**
     * Cherche et retourne un {@link Group}, qui n'est pas validé, pas encore plein
     * et dont le nom correspond au jeu du groupe
     * en récupérant les infos liés (capitaine, membres et jeu)
     * @param {String} name Nom du jeu
     * @returns undefined si non trouvé, {@link Group} sinon
     */
    client.findGroupNotFullByGameName = async name => {
        const games = await client.findGamesByName(name);
        // recup array _id
        var ids = games.map(function(g) { return g._id; });

        // cherche parmis les _id & groupe non rempli
        const data = await Group.find({
            $and: [
                { validated: false },
                { game: {$in: ids} },
                { $expr: { $lt: [ "$size", "$nbMax" ]} },
            ]})
            .populate('captain')
            .populate('members')
            .populate('game');
        if (data) return data;
        else return;
    };

    /* GAMES */
    /**
     * Créer un nouveau {@link Game} et le sauvegarde en base
     * @param {Object} game Groupe à sauvegarder
     * @returns 
     */
    client.createGame = async game => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, game);
        const createGame = await new Game(merged);
        await createGame.save();
        logger.info({prefix:"[DB]", message:"Nouveau game : " + game.name});
    };

    /**
     * Cherche et retourne un {@link Game} en fonction de son Steam App Id
     * @param {String} appid AppId du jeu
     * @returns undefined si non trouvé, tableau de {@link Game} sinon
     */
    client.findGameByAppid = async appid => {
        const data = await Game.findOne({ appid: appid });
        if (data) return data;
        else return;
    };
    client.findMaxAppId = async () => {
        const data = await Game.find({ }).sort({ appid: -1 }).limit(1).then(game => game[0].appid);
        if (data) return data;
        else return;
    };

    /**
     * Cherche et retourne un {@link Game} en fonction de son nom (via Regex /name/i)
     * @param {String} name Nom du jeu
     * @returns undefined si non trouvé, tableau de {@link Game} sinon
     */
    client.findGamesByName = async name => {
        return await client.findGames({ 'name': new RegExp(name, "i") });
    };

    /**
     * Cherche et retourne un {@link Game} en fonction d'une requête Mongodb
     * @param {Object} query Requête
     * @returns undefined si non trouvé, tableau de {@link Game} sinon
     */
    client.findGames = async query => {
        const data = await Game.find(query)
        // .populate('');
        if (data) return data;
        else return;
    };

    /* GUILD CONFIG */
    /**
     * Cherche et retourne un {@link GuildConfig} en fonction de l'id de la guild (serveur)
     * @param {String} guildId Id du serveur
     * @returns undefined si non trouvé, {@link GuildConfig} sinon
     */
    client.findGuildById = async guildId => {
        const data = await GuildConfig.findOne({guildId: guildId});
        if (data) return data;
        else return;
    };

    /**
     * Créer un nouveau {@link GuildConfig} et le sauvegarde en base
     * @param {Object} guild Config serveur à sauvegarder
     * @returns 
     */
    client.createGuild = async guild => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, guild);
        const createGuild = await new GuildConfig(merged);
        const gld = await createGuild.save();
        logger.info({prefix:"[DB]", message:"Nouvelle guild : " + gld.guildId});
        return gld;
    };

    /**
     * Cherche et retourne un tableau de {@link GuildConfig} en fonction d'une requête Mongodb
     * @param {Object} query Requête
     * @returns undefined si non trouvé, tableau {@link GuildConfig} sinon
     */
    client.findGuildConfig = async query => {
        const data = await GuildConfig.find(query)
        if (data) return data;
        else return;
      };

    /* JOB */
    /**
     * Créer un nouveau {@link Job} et le sauvegarde en base
     * @param {Object} job Job à sauvegarder
     * @returns 
     */
    client.createJob = async job => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, job);
        const createJob = await new Job(merged);
        const j = await createJob.save();
        logger.info({prefix:"[DB]", message:"Nouveau job.."});
        return j;
    };

    /**
     * Supprime un groupe
     * @param {Object} group 
     */
    client.deleteJob = async job => {
        // TODO return ? callback ?
        Job.deleteOne({ _id: job._id }).then(j => logger.info({prefix:"[DB]", message:"Delete job : " + job.name}));
    }

    /**
     * Cherche et retourne un tableau de {@link Job} en fonction d'une requête Mongodb
     * @param {Object} query Requête
     * @returns undefined si non trouvé, tableau {@link Job} sinon
     */
    client.findJob = async query => {
        const data = await Job.find(query)
        // .populate('');
        if (data) return data;
        else return;
    };

    client.updateJob = async (job, settings) => {
        let data = job;
        if (typeof data !== "object") data = {};
        for (const key in settings) {
            if(data[key] !== settings[key]) data[key] = settings[key];
        }
        return data.updateOne(settings);
    };

    /* SHOP */
    client.createGameItemShop = async item => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, item);
        const createGameItem = await new GameItem(merged);
        const g = await createGameItem.save();
        
        logger.info({prefix:"[DB]", message:"Nouveau Game Item (shop) : " + item.game.name});
        return g;
    };

    client.findGameItemShop = async query => {
        const data = await GameItem.find(query)
                                    .populate('game seller buyer');
        if (data) return data;
        else return;
    };

    client.findGameItemShopByGame = async query => {
        const agg = [
            {
                // select GameItem
                $match: { itemtype: 'GameItem' }
            }, {
                // jeux pas encore vendu
                $match: { buyer: { '$exists': false } }
            }, {
                // recup info Game
                $lookup: {
                    from: 'games', 
                    localField: 'game', 
                    foreignField: '_id', 
                    as: 'game'
                }
            }, {
                // recup info vendeur
                $lookup: {
                    from: 'users', 
                    localField: 'seller', 
                    foreignField: '_id', 
                    as: 'seller'
                }
            }, {
                // transforme array en Game
                $unwind: { path: '$game' }
            }, {
                // transforme array en User
                $unwind: { path: '$seller' }
            }, { 
                // sort par montant
                $sort: {
                    'montant': 1
                }
            }, {
                // regroupe par jeu
                $group: {
                    _id: '$game', 
                    items: {
                        '$push': '$$ROOT'
                    }
                }
            }, { // TODO obligé de sort pour avoir le meme ordre, pour pouvoir acceder à la bonne page
                // sort par appid
                $sort: {
                    '_id.appid': 1
                }
            }
        ];
        const data = await GameItem.aggregate(agg);
        if (data) return data;
        else return;
    }
}