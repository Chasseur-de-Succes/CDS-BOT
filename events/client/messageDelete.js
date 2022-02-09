const { MessageEmbed } = require('discord.js');
const { PREFIX, CHANNEL} = require('../../config.js');
const { ORANGE } = require('../../data/colors.json');
const { sendLogs } = require('../../util/envoiMsg');

module.exports = async (client, msg) => {
    if(msg.content.startsWith(PREFIX) || msg.author.bot || msg.channel.type === "dm") return;
    
    let embedLog = new MessageEmbed()
        .setTitle("Message supprimer")
        .setColor(ORANGE)
        .setDescription(`Auteur : ${msg.author}`)
        .addField("Message:", msg.content || 'None')
        .setTimestamp();
    client.channels.cache.get(CHANNEL.LOGS).send({ embeds: [embedLog] });

    //sendLogs(client, `Message de ${msg.author} supprimer`, msg.content || 'None', '', ORANGE);
}