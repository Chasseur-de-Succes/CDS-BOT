const mongoose = require('mongoose');

const shopItemSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    type: {
        type: Number,
        default: 0
    },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    montant: Number,
})

module.exports = mongoose.model("ShopItem", shopItemSchema);