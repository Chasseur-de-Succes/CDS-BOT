const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const {
    create,
    dissolve,
    end,
    kick,
    schedule,
    transfert,
    editNbParticipant,
} = require("./subcommands/group");
const { GroupRepository } = require("../repositories");
const { truncateAutocompleteName, getGameAutocompleteOptions } = require("../util/autocompleteUtils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("group")
        .setDescription("Gestion des groupes")
        .setContexts(InteractionContextType.Guild)
        .addSubcommand((sub) =>
            sub
                .setName("create")
                .setDescription("Créer un nouveau groupe, sur un jeu Steam")
                .addStringOption((option) =>
                    option
                        .setName("nom")
                        .setDescription("Nom du groupe")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("jeu")
                        .setDescription("Nom du jeu")
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max")
                        .setDescription("Nombre max de membres dans le groupe"),
                )
                .addStringOption((option) =>
                    option
                        .setName("description")
                        .setDescription(
                            "Description du groupe, quels succès sont rechercher, spécificités, etc",
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("session")
                .setDescription(
                    "Ajoute/supprime une session pour un groupe. Un rappel sera envoyé aux membres 1j et 1h avant",
                )
                .addStringOption((option) =>
                    option
                        .setName("nom")
                        .setDescription("Nom du groupe")
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("jour")
                        .setDescription(
                            "Jour de l'événement, au format DD/MM/YY",
                        )
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("heure")
                        .setDescription("Heure de l'événement, au format HH:mm")
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("dissolve")
                .setDescription(
                    "Dissoud un groupe et préviens les membres de celui-ci (👑 only)",
                )
                .addStringOption((option) =>
                    option
                        .setName("nom")
                        .setDescription("Nom du groupe")
                        .setRequired(true)
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("transfert")
                .setDescription(
                    "Transfert le statut de 👑capitaine à un autre membre du groupe (👑 only)",
                )
                .addStringOption((option) =>
                    option
                        .setName("nom")
                        .setDescription("Nom du groupe")
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addUserOption((option) =>
                    option
                        .setName("membre")
                        .setDescription(
                            "Membre du groupe, deviendra le nouveau capitaine 👑",
                        )
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("end")
                .setDescription("Valide et termine un groupe (👑 only)")
                .addStringOption((option) =>
                    option
                        .setName("nom")
                        .setDescription("Nom du groupe")
                        .setRequired(true)
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("kick")
                .setDescription("Kick un membre du groupe (👑 only)")
                .addStringOption((option) =>
                    option
                        .setName("nom")
                        .setDescription("Nom du groupe")
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addUserOption((option) =>
                    option
                        .setName("membre")
                        .setDescription("Membre du groupe à kick")
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("nb-participant")
                .setDescription(
                    "Modifie le nombre de participants max (👑 only)",
                )
                .addStringOption((option) =>
                    option
                        .setName("nom")
                        .setDescription("Nom du groupe")
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max")
                        .setMinValue(0)
                        .setDescription(
                            "Nouveau nbre max de membres dans le groupe. Mettre 0 si infini.",
                        )
                        .setRequired(true),
                ),
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused(true);
        let filtered = [];
        let choices = [];

        // cmd group create, autocomplete sur nom jeu multi/coop avec succès
        if (focusedValue.name === "jeu" && focusedValue.value) {
            choices = await getGameAutocompleteOptions(focusedValue.value);
        }

        // autocomplete sur nom groupe
        if (focusedValue.name === "nom") {
            filtered = await GroupRepository.findByNameAndGuildId(focusedValue.value, interaction.guildId);

            // Formatage des objets pour l'autocomplete Discord ({ name, value })
            choices = filtered.map((element) => ({
                // si nom jeu dépasse limite imposé par Discord (100 char)
                name: truncateAutocompleteName(element.name),
                // on utilise l'id pour le groupe
                value: String(element.id),
            }));
        }

        await interaction.respond(choices);
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "create") {
            await create(interaction, interaction.options);
        } else if (subcommand === "session") {
            await schedule(interaction, interaction.options);
        } else if (subcommand === "dissolve") {
            await dissolve(interaction, interaction.options);
        } else if (subcommand === "transfert") {
            await transfert(interaction, interaction.options);
        } else if (subcommand === "end") {
            await end(interaction, interaction.options);
        } else if (subcommand === "kick") {
            await kick(interaction, interaction.options);
        } else if (subcommand === "nb-participant") {
            await editNbParticipant(interaction, interaction.options);
        }
    },
};
