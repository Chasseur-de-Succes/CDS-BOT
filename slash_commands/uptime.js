const {
    SlashCommandBuilder,
    EmbedBuilder,
    TimestampStyles,
    time,
} = require("discord.js");
const { CORNFLOWER_BLUE } = require("../data/colors.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("uptime")
        .setDMPermission(false)
        .setDescription("Depuis quand le bot est up ?"),
    async execute(interaction) {
        const date = new Date();

        // We substract the uptime of the bot from the actual time to get the bot starting date
        date.setMilliseconds(
            date.getMilliseconds() - interaction.client.uptime,
        );

        // Build the embed and send it
        const embed = new EmbedBuilder()
            .setColor(CORNFLOWER_BLUE)
            .setTitle("Uptime")
            .setDescription(time(date, TimestampStyles.RelativeTime));

        await interaction.reply({ embeds: [embed] });
    },
};
