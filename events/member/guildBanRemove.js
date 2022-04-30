const { GREEN } = require('../../data/colors.json');
const { MessageEmbed } = require("discord.js");
const { sendLogs } = require('../../util/envoiMsg');

module.exports = async (client, user) => {
    const embedLog = new MessageEmbed()
        .setColor(GREEN)
        .setAuthor(`Membre débanni`, user.user.displayAvatarURL({dynamic: true, size: 4096, format: 'png'}))
        .setThumbnail(user.user.displayAvatarURL({dynamic : true, size: 4096, format: 'png'}))
        .setDescription(`<@${user.user.id}>\n`)
        .addFields(
            {name: "Membre", value: `\`${user.user.tag}\` - <@${user.user.id}>`, inline: true},
        )
        .setFooter(`ID: ${user.user.id}`)
        .setTimestamp();

    sendLogs(client, embedLog);
}