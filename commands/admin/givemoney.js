const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { check_mark, cross_mark } = require('../../data/emojis.json');
const { dark_red } = require("../../data/colors.json");
const { run } = require('../misc/register');

module.exports.run = async (client, message, args) => {
    return message.channel.send("command en développement !");
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.GIVEMONEY;