const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    appid: Number,
    name: String,
    // TODO objet tag 'categories' ?
    /* tags: [{
        id: Number,
        description: String
    }], */
    isMulti: Boolean, // pour faciliter la recherche TODO facilité ? 
    isCoop: Boolean,
    // isCoopOnline: Boolean,
    hasAchievements: Boolean, 
    // TODO img url ?
    // TODO achievements
})

module.exports = mongoose.model("Game", gameSchema);