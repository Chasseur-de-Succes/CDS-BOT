const { MessageEmbed } = require('discord.js');
const { PREFIX, CHANNEL} = require('../../config.js');
const { ORANGE } = require('../../data/colors.json');
const { Msg } = require('../../models/index.js');
const { sendLogs } = require('../../util/envoiMsg');

module.exports = async (client, msg) => {
    // delete msg sauvegardé dans bdd
    await Msg.deleteMany({ msgId: msg.id });

    if(msg.content.startsWith(PREFIX) || msg.author.bot || msg.channel.type === "dm") return;
    
    let embedLog = new MessageEmbed()
        .setTitle("Message supprimé")
        .setColor(ORANGE)
        .setDescription(`Auteur : ${msg.author}`)
        .addField("Message:", msg.content || 'None')
        .setTimestamp();
    client.channels.cache.get(CHANNEL.LOGS).send({ embeds: [embedLog] });

    //sendLogs(client, `Message de ${msg.author} supprimé`, msg.content || 'None', '', ORANGE);
}