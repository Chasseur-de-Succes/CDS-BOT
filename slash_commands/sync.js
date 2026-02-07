const { GREEN, NIGHT } = require("../data/colors.json");
const {
    SlashCommandBuilder,
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
            ephemeral: true,
        });

        const commaandsPath = path.join(__dirname);
        const commandFiles = fs
            .readdirSync(commaandsPath)
            .filter((file) => file.endsWith(".js"));

        const globalCommands = [];
        const guildCommands = [];

        for (const file of commandFiles) {
            const filePath = path.join(commaandsPath, file);
            const command = require(filePath);

            if (!command.data) continue;

            if (command.devOnly) {
                guildCommands.push(command.data.toJSON());
            } else {
                globalCommands.push(command.data.toJSON());
            }
        }

        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

        // Global
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENTID),
            { body: globalCommands },
        );
        logger.info(`✅ Successfully reloaded ${data.length} global commands.`);

        // Guild-only (DEV)
        const dataDev = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENTID,
                process.env.DEV_GUILD_ID,
            ),
            { body: guildCommands },
        );
        logger.info(
            `✅ Successfully reloaded ${dataDev.length} dev (guild-only) commands.`,
        );

        embed = new EmbedBuilder()
            .setColor(GREEN)
            .setDescription(`✅ Synchronisation terminée.`);

        //await interaction.editReply('✅ Synchronisation terminée.');
        await interaction.editReply({ embeds: [embed] });
    },
};
