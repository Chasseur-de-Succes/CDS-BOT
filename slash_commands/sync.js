const { GREEN, NIGHT } = require("../data/colors.json");
const {
    SlashCommandBuilder,
    MessageFlags,
    EmbedBuilder,
    REST,
    Routes,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
    devOnly: true,

    data: new SlashCommandBuilder()
        .setName("sync")
        .setDescription("Synchronise les slash commands (dev only)")
        .setDMPermission(false),

    async execute(interaction) {
        let embed = new EmbedBuilder()
            .setColor(NIGHT)
            .setDescription(`🔄 Synchronisation en cours...`);

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });

        const commandsPath = path.join(__dirname);
        const commandFiles = fs
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith(".js"));

        const commands = [];

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if (!command.data) continue;

            commands.push(command.data.toJSON());
        }

        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENTID),
            { body: commands },
        );
        logger.info(`✅ Successfully reloaded ${data.length} global commands.`);

        embed = new EmbedBuilder()
            .setColor(GREEN)
            .setDescription(`✅ Synchronisation terminée.`);

        await interaction.editReply({ embeds: [embed] });
    },
};
