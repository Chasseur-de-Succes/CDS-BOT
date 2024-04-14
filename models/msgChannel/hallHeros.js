const mongoose = require("mongoose");
const Message = require("./msg");

module.exports = Message.discriminator(
    "MsgHallHeros",
    new mongoose.Schema({
        // nb 🏆, 💯 et custom ou autre
        reactions: {
            type: Map,
            of: Number,
        },
    }),
);
