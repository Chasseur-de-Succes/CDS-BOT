const mongoose = require('mongoose');

const guildConfigSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    guildId: String,
    whitelistChannel : [{
        "type": String
    }],
    channels : {
        welcome: String,
        role: String,
        list_group: String,
        hall_heros: String,
        hall_zeros: String,
        logs: String,
        create_vocal: String,
        cat_discussion_groupe: String,
        cat_discussion_groupe_2: String,
        advent: String,
        feed_bot: String
    },
    voice_channels : [String]
})

module.exports = mongoose.model("GuildConfig", guildConfigSchema);
