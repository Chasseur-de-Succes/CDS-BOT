const mongoose = require("mongoose");
const Message = require("./msg");

const aideSchema = Message.discriminator(
    "MsgDmdeAide",
    new mongoose.Schema({
        // TODO ?
    }),
);

module.exports = mongoose.model("MsgDmdeAide");
