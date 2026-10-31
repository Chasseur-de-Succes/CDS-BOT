const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const {
    inscription,
    validerJeu,
    classement,
    infoBoss,
} = require("./subcommands/tower");
const { getGameAutocompleteOptions } = require("../util/autocompleteUtils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tower")
        .setDescription("Événement communautaire lié à une tour")
        .setContexts(InteractionContextType.Guild)
        .addSubcommand((sub) =>
            sub
                .setName("inscription")
                .setDescription("S'inscrire à l'événement"),
        )
        .addSubcommand((sub) =>
            sub
                .setName("classement")
                .setDescription("Classement de l'événement")
                .addIntegerOption((option) =>
                    option
                        .setName("saison")
                        .setDescription("Saison de l'événement"),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("info-boss")
                .setDescription("Informations liées au boss"),
        )
        .addSubcommand((sub) =>
            sub
                .setName("valider-jeu")
                .setDescription("Valider un jeu (100%)")
                .addIntegerOption((option) =>
                    option
                        .setName("appid")
                        .setDescription("Appid du jeu Steam"),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("jeu")
                        .setDescription("Nom du jeu")
                        .setAutocomplete(true),
                ),
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused(true);
        let choices = [];

        // cmd boss valider, autocomplete sur nom jeu
        if (focusedValue.name === "jeu" && focusedValue.value) {
            choices = await getGameAutocompleteOptions(focusedValue.value);
        }

        await interaction.respond(choices);
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "inscription") {
            await inscription(interaction, interaction.options);
        } else if (subcommand === "valider-jeu") {
            await validerJeu(interaction, interaction.options);
        } else if (subcommand === "classement") {
            await classement(interaction, interaction.options);
        } else if (subcommand === "info-boss") {
            await infoBoss(interaction, interaction.options);
        }
    },
};
