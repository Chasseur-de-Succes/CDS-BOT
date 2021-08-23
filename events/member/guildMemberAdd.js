const color = require('../../data/colors.json');
const { MessageEmbed } = require("discord.js");

module.exports = async (client, member) => {
    const embed = new MessageEmbed()
    .setColor(color.cornflower_blue)
    .setTitle(`Nouveau membre • (${member.guild.name})`)
    .setDescription(`<@${member.id}>`)
    .addField("ID", member.id);

    client.channels.cache.get('872898815097716807').send({embeds: [embed]});
    
    // !!! vérifié si user déjà présent (guild id + user id)
    const newUser = {
        guildID: member.guild.id,
        guildName: member.guild.name,
        userID: member.id,
        username: member.user.tag,
    }

    await client.createUser(newUser);
}