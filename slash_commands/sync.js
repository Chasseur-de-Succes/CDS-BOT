const { GREEN, NIGHT } = require("../data/colors.json");
const {
    SlashCommandBuilder,
    MessageFlags,
    EmbedBuilder,
} = require("discord.js");
const path = require("path");
const { reloadCommands } = require("../util/reloadCommands");
const { createError } = require("../util/envoiMsg");

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
            //flags: MessageFlags.Ephemeral,
        });

        const commandsPath = path.join(__dirname);

        try {
            const result = await reloadCommands(commandsPath, logger);

            embed = new EmbedBuilder()
                .setColor(GREEN)
                .setDescription(`✅ ${result.count} commandes rechargées.`);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            return interaction.editReply({
                embeds: [
                    createError(
                        `❎ Échec du rechargement des commandes : ${error.message}.`,
                    ),
                ],
            });
        }
    },
};
