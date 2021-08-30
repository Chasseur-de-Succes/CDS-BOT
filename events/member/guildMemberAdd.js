const color = require('../../data/colors.json');
const { MessageEmbed } = require("discord.js");

module.exports = async (client, member) => {
    const embed = new MessageEmbed()
    .setColor(color.cornflower_blue)
    .setTitle(`Nouveau membre`)
    .setDescription(`<@${member.id}>`)
    .addField("ID", member.id);

    client.channels.cache.get('879825669243170847').send({embeds: [embed]});
}