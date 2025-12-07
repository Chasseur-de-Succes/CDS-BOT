const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ButtonBuilder,
} = require("discord.js");
const { game, help, play } = require("./subcommands/roulette");
const { GREEN, DARK_RED } = require("../data/colors.json");
const { CHECK_MARK, CROSS_MARK } = require("../data/emojis.json");
const { createError } = require("../util/envoiMsg");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roulette")
        .setDescription(`Création d'un compte CDS`)
        .setContexts(["Guild"])
        .addSubcommand((sub) =>
            sub
                .setName("help")
                .setDescription("Affiche l'aide de la roulette."),
        )
        .addSubcommand((sub) =>
            sub.setName("play").setDescription("Lance la roulette."),
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "help") {
            await help(interaction, interaction.options);
        } else if (subcommand === "play") {
            await play(interaction, interaction.options);
        }
    },
};
