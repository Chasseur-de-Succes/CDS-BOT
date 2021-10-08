const mongoose = require("mongoose");
const { User, Group, Game, Job } = require("../models/index");

module.exports = client => {
    /* User */
    client.createUser = async user => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, user);
        const createUser = await new User(merged);
        const usr = await createUser.save();
        console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Nouvel utilisateur : ${usr.username}`)
        return usr;
    };
    
    client.findUserById = async id => {
        const data = await User.findOne({userId: id});
        if (data) return data;
        else return;
    };

    client.getUser = async user => {
        return client.findUserById(user.id);
    };

    client.updateUser = async (user, settings) => {
        // let data = await client.getUser(user);
        let data = user;
        if (typeof data !== "object") data = {};
        for (const key in settings) {
            if(data[key] !== settings[key]) data[key] = settings[key];
        }
        return data.updateOne(settings);
    };

    /* Guild ? Créer d'autres fichiers de fonctions ? */

    /* Group */
    client.createGroup = async group => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, group);
        const createGroup = await new Group(merged);
        let grp = await createGroup.save()
        await grp.populate('captain members').execPopulate()
        console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Nouveau groupe : ${grp.name}`);
        return grp;
    };

    client.deleteGroup = async group => {
        // TODO return ? callback ?
        Group.deleteOne({ _id: group._id }).then(grp => console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Delete groupe : ${group.name}`));
    }

    client.updateGroup = async (group, settings) => {
        let data = group;
        if (typeof data !== "object") data = {};
        for (const key in settings) {
            if(data[key] !== settings[key]) data[key] = settings[key];
        }
        return data.updateOne(settings);
    };

    client.findGroup = async query => {
        const data = await Group.find(query)
                                .populate('captain members game');
        if (data) return data;
        else return;
    }

    client.findGroupById = async id => {
        return Group.findById(id)
            .populate('captain members game');
    };

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
    client.createGame = async game => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, game);
        const createGame = await new Game(merged);
        createGame.save().then(game => console.debug(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Nouveau game : ${game.name}`));
    };

    client.findGameByAppid = async appid => {
        return await client.findGames({ appid: appid });
    };

    client.findGamesByName = async name => {
        return await client.findGames({ 'name': new RegExp(name, "i") });
    };

    client.findGames = async query => {
        const data = await Game.find(query)
        // .populate('');
        if (data) return data;
        else return;
    };

    /* GUILD CONFIG */
    client.findGuildById = async guildId => {
        const data = await Guild.findOne({guildId: id});
        if (data) return data;
        else return;
    }

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

    client.updateJob = async (job, settings) => {
        let data = job;
        if (typeof data !== "object") data = {};
        for (const key in settings) {
            if(data[key] !== settings[key]) data[key] = settings[key];
        }
        return data.updateOne(settings);
    };
}