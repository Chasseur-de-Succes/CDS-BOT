const mongoose = require("mongoose");

const baseOptions = {
    discriminatorKey: "itemtype",
    collection: "items",
};

// propriétés partagées avec autres item du shop
module.exports = mongoose.model(
    "ItemShop",
    new mongoose.Schema(
        {
            _id: mongoose.Schema.Types.ObjectId,
            name: String,
            montant: Number,
        },
        baseOptions,
    ),
);
