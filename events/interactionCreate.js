const { Events } = require("discord.js");
const ticket = require("./interactions/ticket");
const { sendStackTrace } = require("../util/envoiMsg");
module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Interactions liées aux tickets
        if (interaction.customId?.split("-")[0] === "ticket") {
            await ticket.execute(interaction);
        }

        // Autres interactions
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

                sendStackTrace(
                    interaction.client,
                    error,
                    `Erreur lors de l'exécution de la commande ${interaction.commandName}`,
                );
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
        }
    },
};
