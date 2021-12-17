const { CORNFLOWER_BLUE} = require('../../data/colors.json');
const { MessageEmbed } = require("discord.js");

module.exports = async (client, member) => {
    const embed = new MessageEmbed()
    .setColor(CORNFLOWER_BLUE)
    .setTitle(`Nouveau membre`)
    .setDescription(`<@${member.id}>`)
    .addField("ID", member.id);

    client.channels.cache.get('879395583390003281').send({embeds: [embed]});
}