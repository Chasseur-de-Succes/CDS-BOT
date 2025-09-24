const mongoose = require("mongoose");

const cheatSuspicions = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userId: String,
    reporterId: String,
    reason: String,
    date: Date,
});

module.exports = mongoose.model("CheatSuspicions", cheatSuspicions);