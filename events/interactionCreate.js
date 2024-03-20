const {
    Events,
    ChannelType,
    EmbedBuilder,
    PermissionFlagsBits,
    ButtonStyle,
    ButtonBuilder,
    ActionRowBuilder,
} = require("discord.js");
const { GREEN } = require("../data/colors.json");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(
                interaction.commandName,
            );

            if (!command) {
                console.error(
                    `No command matching ${interaction.commandName} was found.`,
                );
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                // TODO Embed error
                // TODO editReply ou reply..
                await interaction.reply({
                    content: "There was an error while executing this command!",
                    ephemeral: true,
                });
            }
        } else if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(
                interaction.commandName,
            );

            if (!command) {
                console.error(
                    `No command matching ${interaction.commandName} was found.`,
                );
                return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(error);
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === "ticket-create") {
                const ticketTitle =
                    interaction.fields.getTextInputValue("ticket-title");
                const ticketContent =
                    interaction.fields.getTextInputValue("ticket-content");

                // Get tickets channel
                // TODO use salon configurations
                const ticketChannel = interaction.client.channels.cache.find(
                    (c) =>
                        c.name === "tickets" &&
                        c.type === ChannelType.GuildText,
                );

                const thread = await ticketChannel.threads.create({
                    name: ticketTitle,
                    reason: `New ticket : ${ticketTitle}`,
                    type: ChannelType.PrivateThread,
                });

                // Ajout du créateur du ticket au thread
                await thread.members.add(interaction.user);

                // Ajout des administrateurs au thread
                interaction.guild.members.cache.map(async (m) => {
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

                const resolve = new ButtonBuilder()
                    .setCustomId("ticket-0001-resolve")
                    .setLabel("Indiquer comme résolu")
                    .setStyle(ButtonStyle.Success);

                const close = new ButtonBuilder()
                    .setCustomId("ticket-0001-close")
                    .setLabel("Clore le ticket")
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(
                    resolve,
                    close,
                );

                // Envoi de l'embed avec bouton
                thread.send({ embeds: [embed], components: [row] });

                await interaction.reply({
                    content: `Ton ticket \`${ticketTitle}\` a bien été reçu !`,
                    ephemeral: true,
                });
            }
        } else if (interaction.isButton()) {
            if (interaction.customId.split("-")[0] === "ticket") {
                if (interaction.channel.type !== ChannelType.PrivateThread)
                    return;

                switch (interaction.customId.split("-")[2]) {
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
            }
        }
    },
};
