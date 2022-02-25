const mongoose = require('mongoose');
const ItemShop = require('./itemShop');

// TODO shop custom
const customItemSchema = ItemShop.discriminator('CustomItem', new mongoose.Schema({
        // TODO
    })
);

module.exports = mongoose.model("CustomItem");