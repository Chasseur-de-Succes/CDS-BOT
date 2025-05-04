const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../../util/envoiMsg");
const { YELLOW, NIGHT } = require("../../../../data/colors.json");
const { CHECK_MARK } = require("../../../../data/emojis.json");

async function remove(interaction, options) {
    const user = options.get("user")?.value;
    const number = options.get("number")?.value;
    const client = interaction.client;
    const author = interaction.member;

    const embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Note de cheat supprimé à ${user}`)
        .setDescription(`.`);
    interaction.reply({ embeds: [embed] });
}

exports.remove = remove;