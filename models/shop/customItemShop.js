const mongoose = require("mongoose");
const ItemShop = require("./itemShop");

// TODO shop custom
module.exports = ItemShop.discriminator(
    "CustomItem",
    new mongoose.Schema({
        // TODO
    }),
);
