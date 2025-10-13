const { EmbedBuilder } = require("discord.js");
const { createLogs, createError } = require("../../../../util/envoiMsg");
const { CRIMSON, GREEN } = require("../../../../data/colors.json");
const { CHECK_MARK } = require("../../../../data/emojis.json");

async function add(interaction, options) {
    const userId = options.get("user")?.value;
    const reason = options.get("reason")?.value;
    const client = interaction.client;
    const guildId = interaction.guildId;
    const author = interaction.member;
    const authorId = interaction.member.id;

    await interaction.deferReply();

    if (reason.length > 500)
        return interaction.editReply({
            embeds: [
                createError(
                    `La raison est trop longue ${reason.length} caractères. Maximum autorisé: 500)`,
                ),
            ],
            ephemeral: true,
        });

    const user = await client.users.fetch(userId);
    const date = new Date();

    await client.createCheatSuspicion({
        userId: userId,
        reporterId: authorId,
        reason: reason,
        date: date,
    });

    createLogs(
        client,
        guildId,
        "🕵️ Nouvelle suspicion de triche !",
        `${author} a ajouté une suspicion de triche sur l'utilisateur ${user}.`,
        "",
        CRIMSON,
    );

    const embed = new EmbedBuilder()
        .setColor(GREEN)
        .setTitle(`${CHECK_MARK} Suspicion de triche ajoutée !`)
        .setDescription(
            `Une nouvelle suspicion de triche a été ajoutée pour ${user}.`,
        )
        .addFields({ name: "Raison", value: `${reason}` });
    await interaction.editReply({ embeds: [embed] });
}

exports.add = add;
