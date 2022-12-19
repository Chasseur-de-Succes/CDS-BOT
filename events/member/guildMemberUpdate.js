const { ORANGE } = require('../../data/colors.json');
const { EmbedBuilder } = require("discord.js");
const { sendLogs } = require('../../util/envoiMsg');

module.exports = async (client, oldUser, newUser) => {
    if(oldUser.nickname != newUser.nickname) {
        let oldNickname = oldUser.nickname || '_Aucun_';
        let newNickname = newUser.nickname ||'_Aucun_';
        const embed = new EmbedBuilder()
            .setColor(ORANGE)
            .setTitle(`Surnom modifier`)
            .setDescription(`<@${newUser.id}>\nAncien surnom: ${oldNickname}\nNouveau surnom: ${newNickname}`)
            .setFooter({text: `ID: ${newUser.id}`})
            .setTimestamp();

        sendLogs(client, oldUser.guild.id, embed);
    }
}