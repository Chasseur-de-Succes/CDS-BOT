const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createError } = require("../util/envoiMsg");
const { cancel, refund, deleteItem } = require("./subcommands/admin/shop");
const { start, stop, down, allGame } = require("./subcommands/admin/tower");
const { CHANNEL, WEBHOOK_ARRAY } = require("../util/constants");
const { salon } = require("./subcommands/admin");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Gestion des différents paramètres du bot")
        .setDMPermission(false)
        .addSubcommandGroup((subcommandGroup) =>
            subcommandGroup
                .setName("tower")
                .setDescription("Gestion de l'événement lié à la tour")
                .addSubcommand((sub) =>
                    sub.setName("start").setDescription("Démarre l'événement"),
                )
                .addSubcommand((sub) =>
                    sub.setName("stop").setDescription("Arrête l'événement"),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("all-game")
                        .setDescription(
                            "Affiche tous les jeux validés par un utilisateur",
                        )
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("L'utilisateur")
                                .setRequired(true),
                        ),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("down")
                        .setDescription("Enlève un étage à un utilisateur")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("L'utilisateur")
                                .setRequired(true),
                        ),
                ),
        )
        .addSubcommandGroup((subcommandGroup) =>
            subcommandGroup
                .setName("shop")
                .setDescription("Gestion de la boutique")
                .addSubcommand((sub) =>
                    sub
                        .setName("cancel")
                        .setDescription("Annule une transaction **en cours**")
                        .addStringOption((option) =>
                            option
                                .setName("id")
                                .setDescription(
                                    "ID de la transaction (récupéré dans msg log)",
                                )
                                .setRequired(true),
                        ),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("refund")
                        .setDescription("Rembourse une transaction **terminé**")
                        .addStringOption((option) =>
                            option
                                .setName("id")
                                .setDescription(
                                    "ID de la transaction (récupéré dans msg log)",
                                )
                                .setRequired(true),
                        ),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("delete")
                        .setDescription("Supprime un item du shop")
                        .addUserOption((option) =>
                            option
                                .setName("vendeur")
                                .setDescription("Le vendeur")
                                .setRequired(true),
                        )
                        .addStringOption((option) =>
                            option
                                .setName("jeu")
                                .setDescription("Nom du jeu")
                                .setAutocomplete(true)
                                .setRequired(true),
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("salon")
                .setDescription("Pour configurer les salons")
                .addStringOption((option) =>
                    option
                        .setName("nom")
                        .setDescription("Nom du paramètre")
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addChannelOption((option) =>
                    option
                        .setName("salon")
                        .setDescription(
                            "Nom du channel correspondant au paramètre",
                        ),
                )
                .addStringOption((option) =>
                    option.setName("hook").setDescription("URL du webhook"),
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction) {
        // cmd adminshop delete, autocomplete sur nom jeu
        const client = interaction.client;
        const focusedValue = interaction.options.getFocused(true);
        const vendeurId = interaction.options.get("vendeur")?.value;

        let filtered = [];

        if (focusedValue.name === "jeu") {
            if (focusedValue.value) {
                filtered = await client.findGameItemShopBy({
                    game: focusedValue.value,
                    seller: vendeurId,
                    notSold: true,
                    limit: 25,
                });
            } else {
                filtered = await client.findGameItemShopBy({
                    seller: vendeurId,
                    notSold: true,
                    limit: 25,
                });
            }

            // on ne prend que les 25 1er (au cas où)
            filtered = filtered.slice(0, 25).map((choice) => ({
                name: choice.game.name,
                value: choice._id,
            }));
        }

        if (focusedValue.name === "nom") {
            filtered = CHANNEL.concat(WEBHOOK_ARRAY);
        }

        await interaction.respond(filtered);
    },
    async execute(interaction) {
        // seulement admin, même si setDefaultMemberPermissions est défini
        const isAdmin = interaction.member.permissions.has(
            PermissionFlagsBits.Administrator,
        );
        if (!isAdmin) {
            return interaction.reply({
                embeds: [
                    createError(
                        "Tu n'as pas le droit d'exécuter cette commande !",
                    ),
                ],
                ephemeral: true,
            });
        }

        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup === "tower") {
            if (subcommand === "start") {
                await start(interaction);
            } else if (subcommand === "stop") {
                await stop(interaction);
            } else if (subcommand === "all-game") {
                await allGame(interaction, interaction.options);
            } else if (subcommand === "down") {
                await down(interaction, interaction.options);
            }
        } else if (subcommandGroup === "shop") {
            if (subcommand === "cancel") {
                await cancel(interaction, interaction.options);
            } else if (subcommand === "refund") {
                await refund(interaction, interaction.options);
            } else if (subcommand === "delete") {
                await deleteItem(interaction, interaction.options);
            }
        } else if (subcommand === "salon") {
            await salon(interaction, interaction.options);
        }
    },
};
