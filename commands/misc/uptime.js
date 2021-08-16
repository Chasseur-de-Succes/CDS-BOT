const Discord = require('discord.js');
const colors = require('../../data/colors.json');
const { MESSAGES } = require('../../util/constants');

module.exports.run = (client, message, args) => {
    //message.channel.send("test");
    let timeUp = client.uptime;
    let embedUp = new Discord.MessageEmbed()
        .setColor(colors.cornflower_blue)
        .setTitle('Uptime')
        .setDescription((Math.round(timeUp / (1000 * 60 * 60 * 24))) + " days, " + (Math.round(timeUp / (1000 * 60 * 60)) % 24) + " hrs, " + (Math.round(timeUp / (1000 * 60)) % 60) + " mins and " + (Math.round(timeUp / 1000) % 60) + " sec");

    message.channel.send(embedUp);
}

module.exports.help = MESSAGES.COMMANDS.MISC.UPTIME;