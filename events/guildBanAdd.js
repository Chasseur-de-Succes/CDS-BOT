const { DARK_RED } = require('../data/colors.json');
const { EmbedBuilder, Events } = require("discord.js");
const { sendLogs } = require('../util/envoiMsg');

module.exports = {
	name: Events.GuildBanAdd,
	async execute(client, ban) {
        const embedLog = new EmbedBuilder()
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
};