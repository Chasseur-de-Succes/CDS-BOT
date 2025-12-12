const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { CORNFLOWER_BLUE } = require("../data/colors.json");
const { discordTimestamp } = require("../util/discordFormatters");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("uptime")
        .setDMPermission(false)
        .setDescription("Depuis quand le bot est up ?"),
    async execute(interaction) {
        const client = interaction.client;

        const date = new Date();
        // on soustrait à la date du jour les millisecondes depuis le uptime du client
        date.setMilliseconds(date.getMilliseconds() - client.uptime);

        const embed = new EmbedBuilder()
            .setColor(CORNFLOWER_BLUE)
            .setTitle("Uptime")
            .setDescription(`${discordTimestamp(date.getTime(), "R")}`);

        await interaction.reply({ embeds: [embed] });
    },
};
