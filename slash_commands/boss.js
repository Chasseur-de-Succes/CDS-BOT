const { SlashCommandBuilder } = require("discord.js");
const { inscription } = require("./subcommands/boss");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("boss")
    .setDescription("Événement communautaire lié au combat d'un boss")
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("inscription")
        .setDescription("S'inscrire à l'événement")
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "inscription") {
      await inscription(interaction);
    }
  }
}