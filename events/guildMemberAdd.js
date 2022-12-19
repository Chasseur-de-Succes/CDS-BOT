const { CORNFLOWER_BLUE } = require('../data/colors.json');
const { EmbedBuilder, Events } = require("discord.js");
const { sendLogs } = require('../util/envoiMsg');

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(client, member) {
        const user = client.users.cache.get(member.id);
        const embed = new EmbedBuilder()
            .setColor(CORNFLOWER_BLUE)
            .setTitle(`Nouveau membre`)
            .setDescription(`<@${member.id}>`)
            .addFields(
                {name: "Âge du compte", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`},
                {name: "ID", value: `${member.id}`},
            );
        sendLogs(client, member.guild.id, embed);
    }
};