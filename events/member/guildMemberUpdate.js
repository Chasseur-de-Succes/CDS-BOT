const { VERY_PALE_BLUE } = require('../../data/colors.json');
const { MessageEmbed } = require("discord.js");
const { CHANNEL } = require('../../config');

module.exports = async (client, member) => {
    // IN DEVELOPMENT - NOT FUNCTIONAL
    //const user = client.users.cache.get(member.id);
    let oldNickname = "x";
    const embed = new MessageEmbed()
        .setColor(VERY_PALE_BLUE)
        .setTitle(`Changement surnom`)
        .setDescription(`<@${member.id}>\nAncien surnom: ${oldNickname}\nNouveau surnom: ${member.nickname}`)
        .setFooter(`ID: ${member.id}`);

    //client.channels.cache.get(CHANNEL.LOGS).send({embeds: [embed]});
}