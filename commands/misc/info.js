const Discord = require('discord.js');
const { Message } = require("discord.js");
const { VERSION } = require("../../config.js");
const colors = require('../../data/colors.json');
//require('date.format');
const cpuStat = require('cpu-stat');
const { MESSAGES } = require('../../util/constants.js');

module.exports.run = (client, message, args) => {
    const botIcon = client.user.displayAvatarURL();

    const botdate = client.user.createdAt;
    //let botdateedit = moment(botdate, 'DD-MM-YYYY')
    let botdateedit = botdate.format("{DD}/{MM}/{Y} à {hh}:{mm}");

    const { version } = require('discord.js');

    cpuStat.usagePercent(function (err, percent, second){
        if(err) {
            console.log(err);
        }

        let timeUp = client.uptime;
        let embedStat = new Discord.MessageEmbed()
        .setColor(colors.green)
        .setTitle(client.user.username)
        .setDescription(`La version actuelle est ${VERSION}\nBot créé par Tobiβiotex#5212`)
        .setThumbnail(botIcon)
        .addField('Créé le', botdateedit)
        .addField('Language', 'JavaScript', true)
        .addField('Library', "discord.js", true)
        .addField('Discord.js', `v${version}`, true)
        .addField('Uptime', (Math.round(timeUp / (1000 * 60 * 60 * 24))) + " days, " + (Math.round(timeUp / (1000 * 60 * 60)) % 24) + " hrs, " + (Math.round(timeUp / (1000 * 60)) % 60) + " mins and " + (Math.round(timeUp / 1000) % 60) + " sec")
        .setFooter('Demandé par ' + message.author.username);

        return message.channel.send(embedStat);

    })
}

module.exports.help = MESSAGES.COMMANDS.MISC.INFO;