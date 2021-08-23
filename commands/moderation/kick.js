const colors = require('../../data/colors.json');
const { MESSAGES } = require('../../util/constants');

module.exports.run = (client, message, args) => {
    message.channel.send("Commande non opérationnelle...");
    // Note disvord.js v13
    // Permissions :
    // - member.permissions.has('SEND_MESSAGES')
    // + member.permissions.has(Permissions.FLAGS.SEND_MESSAGES)
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.KICK;