const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Create a new ticket"),
    async execute(interaction) {
        const ticketTitle = new TextInputBuilder()
            .setCustomId("ticket-title")
            .setLabel("Titre du ticket")
            .setMinLength(5)
            .setMaxLength(1000)
            .setStyle(TextInputStyle.Short);

        const ticketContent = new TextInputBuilder()
            .setCustomId("ticket-content")
            .setLabel("Contenu du ticket")
            .setMinLength(10)
            .setMaxLength(1000)
            .setStyle(TextInputStyle.Paragraph);

        const modal = new ModalBuilder()
            .setCustomId("ticket-create")
            .setTitle("Nouveau ticket")
            .setComponents(
                new ActionRowBuilder().addComponents(ticketTitle),
                new ActionRowBuilder().addComponents(ticketContent),
            );

        // Show the modal to the user
        await interaction.showModal(modal);
    },
};
