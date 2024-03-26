const { SlashCommandBuilder } = require("discord.js");
const { escapeRegExp } = require("../util/util");
const {
    create,
    dissolve,
    end,
    kick,
    schedule,
    transfert,
    editNbParticipant,
    add,
} = require("./subcommands/group");
const { Game, Group } = require("../models");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("group")
        .setDescription("Gestion des groupes")
        .setDMPermission(false)
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
                .addStringOption((option) =>
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
        )
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription(
                    "Ajoute un participant dans un groupe complet ou s'il a trop de groupes.",
                )
                .addUserOption((option) =>
                    option
                        .setName("membre")
                        .setDescription("Membre à ajouter")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("nom")
                        .setDescription("Nom du groupe")
                        .setRequired(true)
                        .setAutocomplete(true),
                ),
        ),
    async autocomplete(interaction) {
        const client = interaction.client;
        const focusedValue = interaction.options.getFocused(true);
        let filtered = [];
        let exact = [];

        // cmd group create, autocomplete sur nom jeu multi/coop avec succès
        if (focusedValue.name === "jeu") {
            // recherche nom exacte
            exact = await client.findGames({
                name: focusedValue.value,
                type: "game",
            });

            // recup limit de 25 jeux, correspondant a la value rentré
            filtered = await Game.aggregate([
                {
                    $match: {
                        name: new RegExp(escapeRegExp(focusedValue.value), "i"),
                    },
                },
                {
                    $match: { type: "game" },
                },
                {
                    $limit: 25,
                },
            ]);

            // filtre nom jeu existant ET != du jeu exact trouvé (pour éviter doublon)
            filtered = filtered.filter(
                (jeu) => jeu.name && jeu.name !== exact[0]?.name,
            );
        }

        // autocomplete sur nom groupe
        if (focusedValue.name === "nom") {
            filtered = await Group.find({
                $and: [
                    { validated: false },
                    { name: new RegExp(escapeRegExp(focusedValue.value), "i") },
                    { guildId: interaction.guildId },
                ],
            });
        }

        // 25 premiers + si nom jeu dépasse limite imposé par Discord (100 char)
        filtered = filtered
            .slice(0, 25)
            .map((element) =>
                element.name?.length > 100
                    ? element.name.substring(0, 96) + "..."
                    : element.name,
            );

        // si nom exact trouvé
        if (exact.length === 1) {
            const jeuExact = exact[0];
            // on récupère les 24 premiers
            filtered = filtered.slice(0, 24);
            // et on ajoute en 1er l'exact
            filtered.unshift(jeuExact.name);
        }

        await interaction.respond(
            filtered.map((choice) => ({ name: choice, value: choice })),
        );
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
        } else if (subcommand === "add") {
            await add(interaction, interaction.options);
        }
    },
};
