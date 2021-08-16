const mongoose = require("mongoose");
const { User } = require("../models/index");

module.exports = client => {
    client.createUser = async user => {
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, user);
        const createUser = await new User(merged);
        createUser.save().then(u => console.log(`Nouvel utilisateur -> ${u.username}`));
    };

    client.getUser = async user => {
        const data = await User.findOne({userID: user.id});
        if (data) return data;
        else return;
    };

    client.updateUser = async (user, settings) => {
        let data = await client.getUser(user);
        if (typeof data !== "object") data = {};
        for (const key in settings) {
            if(data[key] !== settings[key]) data[key] = settings[key];
        }
        return data.updateOne(settings);
    };
}