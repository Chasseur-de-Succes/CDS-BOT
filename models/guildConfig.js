const mongoose = require("mongoose");

const guildConfigSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    guildId: String,
    channels: {
        welcome: String,
        role: String,
        list_group: String,
        hall_heros: String,
        hall_zeros: String,
        logs: String,
        create_vocal: String,
        cat_discussion_groupe: String,
        cat_discussion_groupe_2: String,
        feed_bot: String,
        feed_achievement: String,
        tickets: String,
        event_tower: String,
    },
    voice_channels: [String],
    webhook: {
        feed_achievement: String,
    },
    event: {
        tower: {
            currentSeason: Number,
            startDate: Date,
            started: { type: Boolean, default: false },
            msgClueId: String,
            currentMsgClue: {
                id: String,
                fields: [
                    {
                        id: String,
                        name: String,
                        value: String,
                        found: { type: Boolean, default: false },
                    }
                ]
            },
            history: [
                {
                    season: Number,
                    startDate: Date,
                    endDate: Date,
                    finished: Boolean,
                },
            ],
        },
    },
});

module.exports = mongoose.model("GuildConfig", guildConfigSchema);
