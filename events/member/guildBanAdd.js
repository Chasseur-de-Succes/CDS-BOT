const { DARK_RED } = require('../../data/colors.json');
const { MessageEmbed } = require("discord.js");
const { sendLogs } = require('../../util/envoiMsg');

module.exports = async (client, ban) => {
    const embedLog = new MessageEmbed()
        .setColor(DARK_RED)
        .setAuthor(`Membre banni`, ban.user.displayAvatarURL({dynamic: true, size: 4096, format: 'png'}))
        .setThumbnail(ban.user.displayAvatarURL({dynamic : true, size: 4096, format: 'png'}))
        .setDescription(`<@${ban.user.id}>\n`)
        .addFields(
            {name: "Membre", value: `\`${ban.user.tag}\` - <@${ban.user.id}>`, inline: true},
        )
        .setFooter({ text: `ID: ${ban.user.id}` })
        .setTimestamp();

    sendLogs(client, ban.guild.id, embedLog);
}