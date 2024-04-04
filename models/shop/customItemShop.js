const mongoose = require("mongoose");
const ItemShop = require("./itemShop");

module.exports = ItemShop.discriminator("CustomItem", new mongoose.Schema({}));
