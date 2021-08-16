const { MESSAGES } = require("../../util/constants");

module.exports.run = (client, message, args) => {
    let customMsg = [
        `_Ma latance est suffisament faible pour jouer à Among Us_ <a:amongusrunning:805482576898555964>`,
        `_Ma latance est suffisament faible pour jouer à TF2_ `,
        `_Je n'ai pas de lag, je peux regarder mon stream_ <:streaming:706510479690039296>`
    ];
    let customMsgNumber = Math.floor(Math.random() * customMsg.length)
    message.channel.send("Pong! " + customMsg[customMsgNumber]);
}

module.exports.help = MESSAGES.COMMANDS.MISC.PING;