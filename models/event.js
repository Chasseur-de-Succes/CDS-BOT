const mongoose = require('mongoose');

const eventSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    group : { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    titre: String,
    desc: String,
    date: Date
})

module.exports = mongoose.model("Event", eventSchema);