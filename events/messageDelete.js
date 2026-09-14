const { EmbedBuilder, Events } = require("discord.js");
const { ORANGE } = require("../data/colors.json");
const { sendLogs } = require("../util/envoiMsg");

module.exports = {
    name: Events.MessageDelete,
    async execute(msg) {
        if (msg.author.bot || msg.channel.type === "dm") {
            return;
        }

        const embedLog = new EmbedBuilder()
            .setTitle("Message supprimé")
            .setColor(ORANGE)
            .setDescription(`Auteur : ${msg.author}`)
            .addFields({ name: "Message", value: msg.content || "None" })
            .setTimestamp();
        sendLogs(msg.client, msg.guildId, embedLog);
    },
};
