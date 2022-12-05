const mongoose = require('mongoose');

const grpSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    guildId: String,
    name: String,
    desc: String,
    idMsg: String,
    nbMax: Number,
    captain : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members : [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    size: {
        type: Number,
        default: 1
    },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    dateEvent: [Date],
    dateCreated : {
        type: Date,
        default: Date.now
    },
    dateUpdated : Date,
    validated : {
        type: Boolean,
        default: false
    },
    channelId : String,
})

module.exports = mongoose.model("Group", grpSchema);