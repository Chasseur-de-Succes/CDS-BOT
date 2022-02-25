const mongoose = require('mongoose');

const guildConfigSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    guildId: String,
    whitelistChannel : [{
        "type": String
    }]
})

module.exports = mongoose.model("GuildConfig", guildConfigSchema);