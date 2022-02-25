const { MessageEmbed } = require('discord.js');
const { CORNFLOWER_BLUE} = require('../../data/colors.json');
const { MESSAGES } = require('../../util/constants');

module.exports.run = (interaction) => {
    let timeUp = interaction.client.uptime;
    let embedUp = new MessageEmbed()
        .setColor(CORNFLOWER_BLUE)
        .setTitle('Uptime')
        .setDescription((Math.round(timeUp / (1000 * 60 * 60 * 24))) + " days, " + (Math.round(timeUp / (1000 * 60 * 60)) % 24) + " hrs, " + (Math.round(timeUp / (1000 * 60)) % 60) + " mins and " + (Math.round(timeUp / 1000) % 60) + " sec");

    return interaction.reply({embeds: [embedUp]})
}

module.exports.help = MESSAGES.COMMANDS.MISC.UPTIME;