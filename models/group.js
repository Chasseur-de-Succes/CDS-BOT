const mongoose = require('mongoose');

const grpSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    nbMax: {
        "type": Number,
        "default": 2,
        "min": 2,
        "max": 25
    },
    captain : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members : [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    gameId: Number
})

module.exports = mongoose.model("Group", grpSchema);