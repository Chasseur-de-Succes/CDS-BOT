const { SlashCommandBuilder } = require("discord.js");
const { inscription, validerJeu, classement } = require("./subcommands/tower");
const { Game } = require("../models");
const { escapeRegExp } = require("../util/util");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tower")
    .setDescription("Événement communautaire lié à une tour")
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("inscription")
        .setDescription("S'inscrire à l'événement")
    )
    .addSubcommand((sub) =>
      sub
        .setName("classement")
        .setDescription("Classement de l'événement")
    )
    .addSubcommand((sub) =>
      sub
        .setName("valider-jeu")
        .setDescription("Valider un jeu (100%)")
        .addStringOption((option) =>
          option
            .setName("appid")
            .setDescription("Appid du jeu Steam"),
        )
        .addStringOption((option) =>
          option
            .setName("jeu")
            .setDescription("Nom du jeu")
            .setAutocomplete(true),
      )
    ),
  async autocomplete(interaction) {
    const client = interaction.client;
    const focusedValue = interaction.options.getFocused(true);
    let filtered = [];
    let exact = [];

    // cmd boss valider, autocomplete sur nom jeu
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

    // 25 premiers + si nom jeu dépasse limite imposé par Discord (100 char)
    filtered = filtered
      .slice(0, 25)
      .map((element) => (
        {
          name: (element.name?.length > 100 ? `${element.name.substring(0, 96)}...` : element.name),
          value: element.appid?.toString()
        }
      ));

    // si nom exact trouvé
    if (exact.length === 1) {
      const jeuExact = exact[0];
      // on récupère les 24 premiers
      filtered = filtered.slice(0, 24);
      // et on ajoute en 1er l'exact
      filtered.unshift(
        {
          name: jeuExact.name,
          value: jeuExact.appid?.toString()
        }
      );
    }

    await interaction.respond(
      filtered,
      // filtered.map((choice) => ({ name: choice, value: choice })),
    );

  },
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "inscription") {
      await inscription(interaction, interaction.options);
    } else if (subcommand === "valider-jeu") {
      await validerJeu(interaction, interaction.options);
    } else if (subcommand === "classement") {
      await classement(interaction, interaction.options);
    }
  }
}