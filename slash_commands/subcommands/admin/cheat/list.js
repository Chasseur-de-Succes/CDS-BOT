const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../../util/envoiMsg");
const { YELLOW, NIGHT } = require("../../../../data/colors.json");
const { CHECK_MARK } = require("../../../../data/emojis.json");

async function add(interaction, options) {
    const page = options.get("page")?.value;
    const client = interaction.client;
    const author = interaction.member;

    

    const embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Note de cheat ajouté à ${user}`)
        .setDescription(`Raison : ${reason}`);
    interaction.reply({ embeds: [embed] });
}

exports.add = add;