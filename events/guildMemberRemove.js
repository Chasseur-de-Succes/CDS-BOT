const { DARK_RED } = require('../data/colors.json');
const { EmbedBuilder, Events } = require("discord.js");
const { sendLogs } = require('../util/envoiMsg');

module.exports = {
	name: Events.GuildMemberRemove,
	async execute(member) {
        const embed = new EmbedBuilder()
            .setColor(DARK_RED)
            .setTitle(`Membre parti`)
            .setDescription(`<@${member.id}>`)
            .addFields(
                {name: "Rejoint le", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true},
                {name: `Parti le `, value: `<t:${Math.floor(Date.now() / 1000)}:D>`, inline: true},
                {name: "ID", value: `${member.id}`},
            );
    
        sendLogs(member.client, member.guild.id, embed);
    }
};