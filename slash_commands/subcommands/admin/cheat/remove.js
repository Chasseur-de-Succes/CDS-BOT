const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ButtonBuilder,
} = require("discord.js");
const { createError, createLogs } = require("../../../../util/envoiMsg");
const { CRIMSON, GREEN, DARK_RED } = require("../../../../data/colors.json");
const { CHECK_MARK, CROSS_MARK } = require("../../../../data/emojis.json");
const mongoose = require("mongoose");

async function remove(interaction, options) {
    const suspicionId = options.get("id")?.value;
    const client = interaction.client;
    const author = interaction.member;
    const guildId = interaction.guildId;

    await interaction.deferReply();

    if (!mongoose.Types.ObjectId.isValid(suspicionId))
        return interaction.editReply({
            embeds: [
                createError(
                    "ID de la suspicion de triche non valide !\nID trouvable avec la commande `/admin cheat histoy @user`",
                ),
            ],
        });

    const cheatSuspicionItem = await client.getCheatSuspicionById(suspicionId);
    if (cheatSuspicionItem === undefined)
        return interaction.editReply({
            embeds: [
                createError(
                    "ID de la suspicion de triche non trouvé !\nID trouvable avec la commande `/admin cheat histoy @user`",
                ),
            ],
        });

    let user;
    try {
        const fetched = await client.users.fetch(cheatSuspicionItem.userId);
        user = fetched.toString();
    } catch {
        user = "Utilisateur inconnu";
    }
    const timestamp = Math.floor(cheatSuspicionItem.date.getTime() / 1000);
    let reporter;
    try {
        const fetched = await client.users.fetch(cheatSuspicionItem.reporterId);
        reporter = fetched.toString();
    } catch {
        reporter = "Utilisateur inconnu";
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("confirm")
            .setLabel("Confirmer")
            .setEmoji(CHECK_MARK)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Annuler")
            .setEmoji(CROSS_MARK)
            .setStyle(ButtonStyle.Danger),
    );

    const embedConfirmation = new EmbedBuilder()
        .setColor(GREEN)
        .setTitle("Confirmation")
        .setDescription(`Confirmez-vous supprimer la note suivante :`)
        .addFields({
            name: `Raison`,
            value: `${cheatSuspicionItem.reason}\nPar ${reporter}, le <t:${timestamp}:F>`,
        });

    const msg = await interaction.editReply({
        embeds: [embedConfirmation],
        components: [row],
        fetchReply: true,
    });

    const confirmFilter = (i) =>
        i.customId === "confirm" && i.user.id === interaction.user.id;
    const cancelFilter = (i) =>
        i.customId === "cancel" && i.user.id === interaction.user.id;

    // COLLECTOR sur le message créé
    const timer = 30000; // (30 seconds)
    const confirm = msg.createMessageComponentCollector({
        filter: confirmFilter,
        time: timer,
    });
    const cancel = msg.createMessageComponentCollector({
        filter: cancelFilter,
        time: timer,
    });

    confirm.on("collect", async (i) => {
        await i.deferUpdate();
        await i.editReply({ components: [] });

        await client.deleteCheatSuspicionItem(suspicionId);

        createLogs(
            client,
            guildId,
            "🕵️ Suppression d'une suspicion de triche !",
            `${author} a supprimé une suspicion de triche sur l'utilisateur ${user}.`,
            "",
            CRIMSON,
        );

        const embed = new EmbedBuilder()
            .setColor(GREEN)
            .setTitle(`${CHECK_MARK} Suspicion de triche supprimé`);

        confirm.stop();
        return interaction.editReply({ embeds: [embed] });
    });

    cancel.on("collect", async (i) => {
        await i.deferUpdate();
        await i.editReply({ components: [] });

        const embed = new EmbedBuilder()
            .setColor(DARK_RED)
            .setTitle(
                `${CROSS_MARK} Suppression de la suspicion de triche annulée`,
            );

        return interaction.editReply({ embeds: [embed] });
    });

    // Enleve les boutons si timeout
    confirm.on("end", () => {
        const embed = new EmbedBuilder()
            .setColor(DARK_RED)
            .setTitle(
                `${CROSS_MARK} Suppression de la suspicion de triche annulée`,
            );
        interaction.editReply({ embeds: [embed], components: [] });
    });
}

exports.remove = remove;
