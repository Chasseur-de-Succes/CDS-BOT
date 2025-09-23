const { SlashCommandBuilder } = require("discord.js");
const { createError } = require("../util/envoiMsg");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fetchgame")
        .setDMPermission(false)
        .setDescription("Ajout ou maj d'un jeu dans la base de données.")
        .addIntegerOption((option) =>
            option
                .setName("appid")
                .setDescription("App id du jeu Steam")
                .setRequired(true),
        ),
    async execute(interaction) {
        const appId = interaction.options.get("appid")?.value;
        const client = interaction.client;
        const user = interaction.user;

        await interaction.deferReply();

        try {
            const embed = await client.fetchGame(appId, user.tag);
            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            logger.error(err);
            return interaction.editReply({
                embeds: [createError("Jeu introuvable !")],
            });
        }
    },
};
