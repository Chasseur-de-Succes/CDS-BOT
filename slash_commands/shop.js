const { SlashCommandBuilder } = require("discord.js");
const customItems = require("../data/customShop.json");
const { Game } = require("../models");
const { escapeRegExp } = require("../util/util");
const { jeux, list, custom, sell, remove } = require("./subcommands/shop");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Affiche la boutique")
        .setDMPermission(false)
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
                .setName("custom")
                .setDescription("Ouvre le shop (personnalisation)")
                .addStringOption((option) =>
                    option
                        .setName("type")
                        .setDescription("Type d'item")
                        .setRequired(true)
                        .setAutocomplete(true),
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
            if (interaction.options.getSubcommand() === "custom") {
                const filtered = [];
                for (const x in customItems) {
                    filtered.push({
                        name: customItems[x].title,
                        // description: 'Description',
                        value: `${x}`,
                    });
                }

                await interaction.respond(
                    filtered.map((choice) => ({
                        name: choice.name,
                        value: choice.value,
                    })),
                );
            } else if (interaction.options.getSubcommand() === "sell") {
                const focusedValue = interaction.options.getFocused(true);
                let filtered = [];
                let exact = [];

                // cmd group create, autocomplete sur nom jeu
                if (focusedValue.name === "jeu") {
                    // recherche nom exacte
                    exact = await interaction.client.findGames({
                        name: focusedValue.value,
                        type: { $in: ["game", "dlc"] },
                    });

                    // recup limit de 25 jeux, correspondant a la value rentré
                    filtered = await Game.aggregate([
                        {
                            $match: {
                                name: new RegExp(
                                    escapeRegExp(focusedValue.value),
                                    "i",
                                ),
                            },
                        },
                        {
                            $match: { type: { $in: ["game", "dlc"] } },
                        },
                        {
                            $limit: 25,
                        },
                    ]);

                    // filtre nom jeu existant ET != du jeu exact trouvé (pour éviter doublon)
                    // limit au 25 premiers
                    // si nom jeu dépasse limite imposé par Discord (100 char)
                    // + on prepare le résultat en tableau de {name: '', value: ''}
                    filtered = filtered
                        .filter(
                            (jeu) => jeu.name && jeu.name !== exact[0]?.name,
                        )
                        .slice(0, 25)
                        .map((element) => ({
                            name:
                                element.name?.length > 100
                                    ? `${element.name.substring(0, 96)}...`
                                    : element.name,
                            value: `${element.appid}`,
                        }));
                }

                // si nom exact trouvé
                if (exact.length === 1) {
                    const jeuExact = exact[0];
                    // on récupère les 24 premiers
                    filtered = filtered.slice(0, 24);
                    // et on ajoute en 1er l'exact
                    filtered.unshift({
                        name: jeuExact.name,
                        value: `${jeuExact.appid}`,
                    });
                }

                await interaction.respond(
                    filtered.map((choice) => ({
                        name: choice.name,
                        value: choice.value,
                    })),
                );
            } else if (interaction.options.getSubcommand() === "remove") {
                const focusedValue = interaction.options.getFocused(true);
                const memberId = interaction.member.id;

                let filtered = [];

                if (focusedValue.name === "jeu") {
                    if (focusedValue.value) {
                        filtered = await interaction.client.findGameItemShopBy({
                            game: focusedValue.value,
                            seller: memberId,
                            notSold: true,
                            limit: 25,
                        });
                    } else {
                        filtered = await interaction.client.findGameItemShopBy({
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
                            name: choice.game.name,
                            value: choice._id,
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
        } else if (subcommand === "custom") {
            await custom(interaction, interaction.options);
        } else if (subcommand === "sell") {
            await sell(interaction, interaction.options);
        } else if (subcommand === "remove") {
            await remove(interaction, interaction.options);
        }
    },
};
