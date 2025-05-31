const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../util/envoiMsg");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { NIGHT, YELLOW } = require("../../../data/colors.json");
const mongoose = require("mongoose");

async function remove(interaction, options) {
    const gameId = options.get("jeu")?.value;
    const client = interaction.client;
    const author = interaction.member;
    const guild = interaction.guild;

    if (!Number.parseInt(gameId)) {
        return interaction.reply({
            embeds: [createError("Jeu non valide !")],
        });
    }

    const gameItem = await client.findGameItemShop({
        _id: new mongoose.Types.ObjectId(gameId),
    });
    logger.info(`.. Item ${gameItem[0]._id} choisi`);

    // Test si bien le vendeur
    const seller = guild.members.cache.get(gameItem[0].seller.userId);
    if (author !== seller) {
        return interaction.reply({
            embeds: [createError("Tu n'es pas le vendeur du jeu !")],
        });
    }

    // Test si state n'existe pas
    if (gameItem[0].state) {
        return interaction.reply({
            embeds: [
                createError("Le jeu ne peut pas avoir une demande d'achat !"),
            ],
        });
    }

    const gameName = gameItem[0].game.name;

    // Supprimer item boutique
    try {
        await client.deleteGameItemById(gameId);
    } catch (error) {
        return interaction.reply({
            embeds: [createError("Item du shop non trouvé !")],
        });
    }

    logger.info(`Suppression vente id ${gameName}`);

    const embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Jeu ${gameName} supprimé`);

    await interaction.reply({ embeds: [embed] });
    createLogs(
        client,
        interaction.guildId,
        "Jeu retiré dans le shop",
        `${author} vient de retirer **${gameName}**`,
        `ID : ${gameId}`,
        YELLOW,
    );
}

exports.remove = remove;
