const mongoose = require('mongoose');
const Message = require('./msg');

const zerosSchema = Message.discriminator('MsgHallZeros', new mongoose.Schema({
        // nb 💩 et custom ou autre
        reactions: {
            '💩': { type: Number, default: 0 },
        }
    })
);

module.exports = mongoose.model("MsgHallZeros");