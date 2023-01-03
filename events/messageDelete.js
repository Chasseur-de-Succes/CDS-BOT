const { EmbedBuilder, Events } = require('discord.js');
const { ORANGE } = require('../data/colors.json');
const { Msg } = require('../models/index.js');
const { sendLogs } = require('../util/envoiMsg');

module.exports = {
	name: Events.MessageDelete,
	async execute(msg) {
        const PREFIX = process.env.PREFIX;
        // delete msg sauvegardé dans bdd
        await Msg.deleteMany({ msgId: msg.id });
    
        if(msg.content.startsWith(PREFIX) || msg.author.bot || msg.channel.type === "dm") return;
        
        let embedLog = new EmbedBuilder()
            .setTitle(`Message supprimé`)
            .setColor(ORANGE)
            .setDescription(`Auteur : ${msg.author}`)
            .addFields(
                { name: "Message", value: msg.content || 'None' },
            )
            .setTimestamp();
        sendLogs(msg.client, msg.guildId, embedLog);
    }
};