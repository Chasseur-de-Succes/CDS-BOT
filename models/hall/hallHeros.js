const mongoose = require('mongoose');
const Message = require('./msg');

const herosSchema = Message.discriminator('MsgHallHeros', new mongoose.Schema({
        // nb 🏆, 💯 et custom ou autre
        reactions: {
            '🏆': { type: Number, default: 0 },
            '💯': { type: Number, default: 0 },
        }
    })
);

module.exports = mongoose.model("MsgHallHeros");