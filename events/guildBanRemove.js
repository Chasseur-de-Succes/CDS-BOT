const { GREEN } = require('../data/colors.json');
const { EmbedBuilder, Events } = require("discord.js");
const { sendLogs } = require('../util/envoiMsg');

module.exports = {
	name: Events.GuildBanRemove,
	async execute(ban) {
        const embedLog = new EmbedBuilder()
            .setColor(GREEN)
            .setAuthor(`Membre débanni`, ban.user.displayAvatarURL({dynamic: true, size: 4096, format: 'png'}))
            .setThumbnail(ban.user.displayAvatarURL({dynamic : true, size: 4096, format: 'png'}))
            .setDescription(`${ban.user}`)
            .addFields(
                {name: "Membre", value: `\`${ban.user.tag}\` - ${ban.user}`, inline: true},
            )
            .setFooter({text: `ID: ${ban.user.id}`})
            .setTimestamp();
    
        sendLogs(ban.client, ban.guild.id, embedLog);
    }
};