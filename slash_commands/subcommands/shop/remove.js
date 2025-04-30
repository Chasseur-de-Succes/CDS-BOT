const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../util/envoiMsg");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { NIGHT, YELLOW } = require("../../../data/colors.json");
const mongoose = require("mongoose");

async function remove(interaction, options) {
    const gameId = options.get("jeu")?.value;
    const gameName = options.get("jeu")?.name;
    const client = interaction.client;
    const author = interaction.member;

    const gameItem = await client.findGameItemShop({
        _id: new mongoose.Types.ObjectId(gameId),
    });
    logger.info(`.. Item ${gameItem[0]._id} choisi`);

    // Test si state n'existe pas
    if (gameItem[0].state) {
        return interaction.reply({
            embeds: [
                createError("Le jeu ne peut pas être en cours de vente !"),
            ],
        });
    }

    const gamename = gameItem[0].game.name;

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
        .setTitle(`${CHECK_MARK} Jeu ${gamename} supprimé`);

    await interaction.reply({ embeds: [embed] });
    createLogs(
        client,
        interaction.guildId,
        "Jeu retiré dans le shop",
        `${author} vient de retirer **${gamename}**`,
        `ID : ${gameId}`,
        YELLOW,
    );
}

exports.remove = remove;