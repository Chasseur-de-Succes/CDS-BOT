const { ORANGE } = require('../../data/colors.json');
const { MessageEmbed } = require("discord.js");
const { CHANNEL } = require('../../config');

module.exports = async (client, oldUser, newUser) => {
    let oldNickname = oldUser.nickname || '_Aucun_';
    let newNickname = newUser.nickname ||'_Aucun_';
    const embed = new MessageEmbed()
        .setColor(ORANGE)
        .setTitle(`Surnom modifier`)
        .setDescription(`<@${newUser.id}>\nAncien surnom: ${oldNickname}\nNouveau surnom: ${newNickname}`)
        .setFooter(`ID: ${newUser.id}`)
        .setTimestamp();

    client.channels.cache.get(CHANNEL.LOGS).send({embeds: [embed]});
}