const mongoose = require("mongoose");
const Message = require("./msg");

const herosSchema = Message.discriminator(
    "MsgHallHeros",
    new mongoose.Schema({
        // nb 🏆, 💯 et custom ou autre
        reactions: {
            type: Map,
            of: Number,
        },
    }),
);

module.exports = mongoose.model("MsgHallHeros");
