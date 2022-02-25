const { CORNFLOWER_BLUE } = require('../../data/colors.json');
const { MessageEmbed } = require("discord.js");
const { CHANNEL } = require('../../config');

module.exports = async (client, member) => {
    const user = client.users.cache.get(member.id);
    const embed = new MessageEmbed()
        .setColor(CORNFLOWER_BLUE)
        .setTitle(`Nouveau membre`)
        .setDescription(`<@${member.id}>`)
        .addFields(
            {name: "Âge du compte", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`},
            {name: "ID", value: `${member.id}`},
        );

    client.channels.cache.get(CHANNEL.LOGS).send({embeds: [embed]});
}