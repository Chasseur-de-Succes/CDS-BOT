const { EmbedBuilder } = require("discord.js");
const { createLogs, createError } = require("../../../../util/envoiMsg");
const { CRIMSON, GREEN } = require("../../../../data/colors.json");
const { CHECK_MARK } = require("../../../../data/emojis.json");
const { ObservationRepository } = require("../../../../repositories");

async function add(interaction, options) {
    const user = options.get("user")?.user;
    const reason = options.get("reason")?.value;
    const client = interaction.client;
    const guildId = interaction.guildId;
    const author = interaction.member;

    await interaction.deferReply();

    if (reason.length > 500)
        return interaction.editReply({
            embeds: [
                createError(
                    `La raison dépasse la limite autorisée (${reason.length}/500 caractères).`,
                ),
            ],
            ephemeral: true,
        });

    await ObservationRepository.create(user.id, author.id, reason);

    createLogs(
        client,
        guildId,
        "🕵️ Nouvelle note d'observation !",
        `${author} a ajouté une note d'observation sur l'utilisateur ${user}.`,
        "",
        CRIMSON,
    );

    const embed = new EmbedBuilder()
        .setColor(GREEN)
        .setTitle(`${CHECK_MARK} Note d'observation ajoutée !`)
        .setDescription(
            `Une nouvelle note d'observation a été ajoutée pour ${user}.`,
        )
        .addFields({ name: "Raison", value: `${reason}` });
    await interaction.editReply({ embeds: [embed] });
}

exports.add = add;
