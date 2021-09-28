const mongoose = require('mongoose');

const configServerSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    serverId: String,
    whitelistChannel : [{
        "type": String
    }]
})

module.exports = mongoose.model("ConfigServer", configServerSchema);