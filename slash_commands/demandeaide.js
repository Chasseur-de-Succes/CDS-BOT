const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
} = require("discord.js");
const { VERY_PALE_VIOLET, NIGHT } = require("../data/colors.json");
const { createError } = require("../util/envoiMsg");
const {
    renderRequestHelp,
} = require("../canvas/request_help/renderRequestHelp");
const { escapeRegExp } = require("../util/util");
const { Game } = require("../models");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("demandeaide")
        .setDMPermission(false)
        .setDescription("Affiche une demande d'aide pour un jeu.")
        .addStringOption((option) =>
            option
                .setName("jeu")
                .setDescription("Nom du jeu")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("joueurs")
                .setDescription("Nombre de joueurs recherchés")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("Message")
                .setMaxLength(150),
        ),
    async autocomplete(interaction) {
        const client = interaction.client;
        const focusedValue = interaction.options.getFocused(true);
        let filtered = [];
        let choices = [];
        let exact = [];

        // cmd group create, autocomplete sur nom jeu multi/coop avec succès
        if (focusedValue.name === "jeu" && focusedValue.value) {
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

            // TODO : utiliser une fonction après migration BDD (comme group & shop)
            // Formatage des objets pour l'autocomplete Discord ({ name, value })
            choices = filtered.map((element) => ({
                // si nom jeu dépasse limite imposé par Discord (100 char)
                name:
                    element.name?.length > 100
                        ? `${element.name.substring(0, 96)}...`
                        : element.name,
                // on utilise l'appid pour le jeu
                value: String(element.appid),
            }));
        }

        // si nom exact trouvé (pour 'jeu')
        if (exact.length === 1) {
            const jeuExact = exact[0];
            // on récupère les 24 premiers
            filtered = filtered.slice(0, 24);
            // et on ajoute en 1er l'exact
            choices.unshift({
                name:
                    jeuExact.name.length > 100
                        ? `${jeuExact.name.substring(0, 96)}...`
                        : jeuExact.name,
                value: String(jeuExact.appid),
            });
        } else {
            // Sinon on garde les 25 premiers choix
            choices = choices.slice(0, 25);
        }

        await interaction.respond(choices);
    },
    async execute(interaction) {
        const client = interaction.client;
        const user = interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        const nbPlayers = interaction.options.getInteger("joueurs"); // INTEGER
        const gameAppId = interaction.options.get("jeu")?.value;
        const msg = interaction.options.get("message")?.value;

        await interaction.deferReply();

        // "recherche.."
        // on récupère le custom id "APPID_GAME"
        const game = await client.findGameByAppid(gameAppId);
        const gameName = game.name;
        const pseudo = user.username;

        const reponse = await client.getAppDetails(gameAppId);
        const imageUrl = reponse.body[gameAppId].data.header_image; // ajouter l'url de l'image dans la BDD ?

        // AFFICHAGE CANVAS
        // create image
        const image = await renderRequestHelp(
            pseudo,
            gameName,
            nbPlayers,
            imageUrl,
        );

        const file = new AttachmentBuilder(image, {
            name: `demande-aide_${pseudo}.png`,
        });

        const reply = {
            files: [file],
        };

        if (msg) {
            reply.embeds = [
                new EmbedBuilder().setColor(NIGHT).setDescription(`💬 ${msg}`),
            ];
        }

        // Send message
        await interaction.editReply(reply);
    },
};
