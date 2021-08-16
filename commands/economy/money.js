const { MESSAGES } = require("../../util/constants");

module.exports.run = (client, message, args) => {
    message.channel.send("Commande non opérationnelle..."); //temp
    // récup argent 
}

module.exports.help = MESSAGES.COMMANDS.ECONOMY.MONEY;