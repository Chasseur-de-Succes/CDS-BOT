const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createError } = require("../util/envoiMsg");
const { cancel, refund, deleteItem } = require("./subcommands/adminshop");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("adminshop")
        .setDescription("Gestion de la boutique")
        .setDMPermission(false)
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
    },
    async execute(interaction) {
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

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "cancel") {
            await cancel(interaction, interaction.options);
        } else if (subcommand === "refund") {
            await refund(interaction, interaction.options);
        } else if (subcommand === "delete") {
            await deleteItem(interaction, interaction.options);
        }
    },
};
