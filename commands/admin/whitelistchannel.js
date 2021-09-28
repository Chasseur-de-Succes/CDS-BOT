const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { check_mark, cross_mark } = require('../../data/emojis.json');
const { dark_red } = require("../../data/colors.json");

module.exports.run = async (client, message, args) => {
    if(!message.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) return error(`${cross_mark} Vous n'avez pas la permission requise !`);

    message.react(check_mark);

    function error(err) {
        const embedError = new MessageEmbed()
            .setColor(dark_red)
            .setTitle(`${err}`);
    
        return message.channel.send({embeds: [embedError]});
    }
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.WHITELISTCHANNEL;