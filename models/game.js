const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    appid: Number,
    iconHash: String,
    name: String,
    type: String,
    // TODO objet tag 'categories' ?
    /* tags: [{
        id: Number,
        description: String
    }], */
    isMulti: Boolean, // pour faciliter la recherche TODO facilité ? 
    isCoop: Boolean,
    // isCoopOnline: Boolean,
    hasAchievements: Boolean, 
    isRemoved: Boolean,
    // TODO img url ?
    // achievements
    achievements: [{
        apiName: String,
        displayName: String,
        description: String,
        icon: String,
        icongray: String
    }]
})

module.exports = mongoose.model("Game", gameSchema);