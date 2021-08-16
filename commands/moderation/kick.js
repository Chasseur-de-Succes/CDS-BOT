const colors = require('../../data/colors.json');
const { MESSAGES } = require('../../util/constants');

module.exports.run = (client, message, args) => {
    message.channel.send("Commande non opérationnelle...");
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.KICK;