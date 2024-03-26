const mongoose = require("mongoose");

const rolesChannelSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    roleID: String,
    channelID: String,
    name: String,
    emoji: String,
});

module.exports = mongoose.model("RolesChannel", rolesChannelSchema);
