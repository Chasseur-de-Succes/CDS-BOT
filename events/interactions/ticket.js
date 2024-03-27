const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { SALON } = require("../../util/constants");
const { GREEN } = require("../../data/colors.json");

module.exports = {
    async execute(interaction) {
        if (interaction.isButton()) {
            if (interaction.channel.type !== ChannelType.PrivateThread) return;

            switch (interaction.customId.split("-")[1]) {
                case "close":
                    await interaction.reply(
                        `Le ticket a été clos par ${interaction.user}.`,
                    );

                    // Archivage et verrouillage du ticket
                    await interaction.channel.setLocked(true);
                    await interaction.channel.setArchived(true);
                    break;
                case "resolve":
                    await interaction.reply(
                        `Le ticket a été marqué comme résolu par ${interaction.user}.`,
                    );

                    // Archivage du ticket
                    await interaction.channel.setArchived(true);
                    break;
            }
        } else if (interaction.isModalSubmit()) {
            // Création de ticket
            if (interaction.customId === "ticket-create") {
                const ticketTitle =
                    interaction.fields.getTextInputValue("ticket-title");
                const ticketContent =
                    interaction.fields.getTextInputValue("ticket-content");

                // Récupération du channel de ticket
                const ticketChannelId =
                    await interaction.client.getGuildChannel(
                        interaction.guild.id,
                        SALON.TICKETS,
                    );

                // Gestion d'erreur si aucun salon de ticket n'est défini
                if (!ticketChannelId)
                    return await interaction.reply({
                        content: `Aucun salon de ticket n'a été trouvé.`,
                        ephemeral: true,
                    });

                const ticketChannel =
                    interaction.client.channels.cache.get(ticketChannelId);

                // Création du thread
                const thread = await ticketChannel.threads.create({
                    name: ticketTitle,
                    reason: `New ticket : ${ticketTitle}`,
                    type: ChannelType.PrivateThread,
                });

                // Ajout du créateur du ticket au thread
                await thread.members.add(interaction.user);

                // Ajout des administrateurs au thread
                await interaction.guild.members.cache.map(async (m) => {
                    if (m.permissions.has(PermissionFlagsBits.Administrator)) {
                        await thread.members.add(m.user);
                    }
                });

                // Embed récapitulatif du ticket
                const embed = new EmbedBuilder()
                    .setColor(GREEN)
                    .setTitle(ticketTitle)
                    .setDescription(ticketContent)
                    .setFooter({
                        text: `Sent by ${interaction.user.tag} (${interaction.user.id})`,
                    });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket-resolve")
                        .setLabel("Indiquer comme résolu")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId("ticket-close")
                        .setLabel("Clore le ticket")
                        .setStyle(ButtonStyle.Danger),
                );

                // Envoi de l'embed avec bouton
                thread.send({ embeds: [embed], components: [row] });

                await interaction.reply({
                    content: `Ton ticket \`${ticketTitle}\` a bien été reçu !`,
                    ephemeral: true,
                });
            }
        }
    },
};
