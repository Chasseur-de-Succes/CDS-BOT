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
        "default": 1
    },
    money: {
        "type": Number,
        "default": 0
    },
    banned: {
        "type": Boolean,
        "default": false
    },
    blacklisted: {
        "type": Boolean,
        "default": false
    },
    lastBuy: Date,
    stats: {
        group: {
            created:    { type: Number, default: 0 },
            joined:     { type: Number, default: 0 },
            left:       { type: Number, default: 0 },
            dissolved:  { type: Number, default: 0 },
            ended:      { type: Number, default: 0 }
        },
        msg: { type: Number, default: 0 },
        img: {
            heros: { type: Number, default: 0 },
            zeros: { type: Number, default: 0 },
        },
        misc: {
            // dans Hall des héros, nb de fois qu'un admin a réagi avec emoji custom (a definir)
            hall_heros_approved_by_admin :      { type: Number, default: 0 },
            // dans Hall des zeros, nb de fois qu'un admin a réagi avec emoji custom (a definir)
            hall_zeros_approved_by_admin :      { type: Number, default: 0 },
        }
    }
})

module.exports = mongoose.model("User", userSchema);