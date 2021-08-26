const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userId: String,
    username: String,
    steamId: String,
    experience: {
        "type": Number,
        "default": 0
    },
    level: {
        "type": Number,
        "default": 0
    },
    money: {
        "type": Number,
        "default": 0
    },
    banned: {
        "typr": Boolean,
        "default": false
    }
})

module.exports = mongoose.model("User", userSchema);