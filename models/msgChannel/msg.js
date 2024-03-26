const mongoose = require("mongoose");

const baseOptions = {
    discriminatorKey: "msgType",
    collection: "msgs",
};

// propriétés partagées avec autres item du shop
module.exports = mongoose.model(
    "Message",
    new mongoose.Schema(
        {
            _id: mongoose.Schema.Types.ObjectId,
            author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            msgId: String,
            guildId: String,
        },
        baseOptions,
    ),
);
