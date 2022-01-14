const mongoose = require('mongoose');
const ItemShop = require('./itemShop');

// shop jeu
const gameItemSchema = ItemShop.discriminator('GameItem', new mongoose.Schema({
        game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        state: String,
    })
);

module.exports = mongoose.model("GameItem");