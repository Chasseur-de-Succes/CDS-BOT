const mongoose = require("mongoose");
const Message = require("./msg");

module.exports = Message.discriminator(
    "MsgDmdeAide",
    new mongoose.Schema({
        // TODO ?
    }),
);
