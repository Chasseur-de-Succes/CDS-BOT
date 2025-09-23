const mongoose = require("mongoose");

const gameSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    appid: Number,
    iconHash: String,
    name: String,
    type: String,
    isMulti: Boolean, // pour faciliter la recherche
    isCoop: Boolean,
    // isCoopOnline: Boolean,
    hasAchievements: Boolean,
    isRemoved: Boolean,
    // achievements
    achievements: [
        {
            apiName: String,
            displayName: String,
            description: String,
            icon: String,
            icongray: String,
        },
    ],
});

module.exports = mongoose.model("Game", gameSchema);
