const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { jeux, list, sell, remove } = require("./subcommands/shop");
const { GameItemShopRepository } = require("../repositories");
const { getGameAutocompleteOptions } = require("../util/autocompleteUtils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Affiche la boutique")
        .setContexts(InteractionContextType.Guild)
        .addSubcommand((sub) =>
            sub.setName("list").setDescription("Liste les jeux achetable"),
        )
        .addSubcommand((sub) =>
            sub
                .setName("jeux")
                .setDescription("Ouvre le shop (Jeux)")
                .addIntegerOption((option) =>
                    option.setName("page").setDescription("N° de page du shop"),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("sell")
                .setDescription("Vend une clé Steam")
                .addStringOption((option) =>
                    option
                        .setName("jeu")
                        .setDescription("Nom du jeu")
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("prix")
                        .setDescription(`Prix du jeu (en ${process.env.MONEY})`)
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Supprimer un jeu mis en vente")
                .addStringOption((option) =>
                    option
                        .setName("jeu")
                        .setDescription("Nom du jeu")
                        .setRequired(true)
                        .setAutocomplete(true),
                ),
        ),
    async autocomplete(interaction) {
        if (interaction.commandName === "shop") {
            if (interaction.options.getSubcommand() === "sell") {
                const focusedValue = interaction.options.getFocused(true);
                let choices = [];

                // cmd shop sell, autocomplete sur nom jeu
                if (focusedValue.name === "jeu" && focusedValue.value) {
                    choices = await getGameAutocompleteOptions(focusedValue.value);

                    await interaction.respond(choices);
                }
            } else if (interaction.options.getSubcommand() === "remove") {
                const focusedValue = interaction.options.getFocused(true);
                const memberId = interaction.member.id;

                let filtered = [];

                if (focusedValue.name === "jeu") {
                    if (focusedValue.value) {
                        filtered = await GameItemShopRepository.findGameItemShopBy({
                            game: focusedValue.value,
                            seller: memberId,
                            notSold: true,
                            limit: 25,
                        });
                    } else {
                        filtered = await GameItemShopRepository.findGameItemShopBy({
                            seller: memberId,
                            notSold: true,
                            limit: 25,
                        });
                    }
                }

                await interaction.respond(
                    // on ne prend que les 25 1er (au cas où)
                    filtered
                        .slice(0, 25)
                        .map((choice) => ({
                            name: choice.gameInfo.name,
                            value: String(choice.id),
                        })),
                );
            }
        }
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "list") {
            await list(interaction, interaction.options);
        } else if (subcommand === "jeux") {
            await jeux(interaction, interaction.options, true);
        } else if (subcommand === "sell") {
            await sell(interaction, interaction.options);
        } else if (subcommand === "remove") {
            await remove(interaction, interaction.options);
        }
    },
};
