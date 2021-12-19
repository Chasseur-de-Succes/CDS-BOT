const mongoose = require("mongoose");
const { User, Group, Game, Job, GuildConfig } = require("../models/index");

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
     * @param {User} user Utilisateur à sauvegarder
     * @returns 
     */
    client.createUser = async user => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, user);
        const createUser = await new User(merged);
        const usr = await createUser.save();
        console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Nouvel utilisateur : ${usr.username}`);
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
     * @param {Group} group Groupe à sauvegarder
     * @returns 
     */
    client.createGroup = async group => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, group);
        const createGroup = await new Group(merged);
        let grp = await createGroup.save()
        await grp.populate('captain members').execPopulate()
        console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Nouveau groupe : ${grp.name}`);
        return grp;
    };

    /**
     * Supprime un groupe
     * @param {Group} group 
     */
    client.deleteGroup = async group => {
        // TODO return ? callback ?
        Group.deleteOne({ _id: group._id }).then(grp => console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Delete groupe : ${group.name}`));
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
     * @param {Game} game Groupe à sauvegarder
     * @returns 
     */
    client.createGame = async game => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, game);
        const createGame = await new Game(merged);
        createGame.save().then(game => console.debug(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Nouveau game : ${game.name}`));
    };

    /**
     * Cherche et retourne un {@link Game} en fonction de son Steam App Id
     * @param {String} appid AppId du jeu
     * @returns undefined si non trouvé, tableau de {@link Game} sinon
     */
    client.findGameByAppid = async appid => {
        return await client.findGames({ appid: appid });
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
     * @param {GuildConfig} guild Config serveur à sauvegarder
     * @returns 
     */
    client.createGuild = async guild => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, guild);
        const createGuild = await new GuildConfig(merged);
        const gld = await createGuild.save();
        console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Nouvelle guild : ${gld.guildId}`);
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
    client.createJob = async job => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, job);
        const createJob = await new Job(merged);
        const j = await createJob.save();
        console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Nouveau job..`)
        return j;
    };

    client.deleteJob = async job => {
        // TODO return ? callback ?
        Job.deleteOne({ _id: job._id }).then(j => console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Delete job : ${job.name}`));
    }

    client.findJob = async query => {
        const data = await Job.find(query)
        // .populate('');
        if (data) return data;
        else return;
    };
}