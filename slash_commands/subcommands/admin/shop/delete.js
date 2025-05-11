const { createError, createLogs } = require("../../../../util/envoiMsg");
const { EmbedBuilder } = require("discord.js");
const { YELLOW, NIGHT } = require("../../../../data/colors.json");
const { CHECK_MARK } = require("../../../../data/emojis.json");
const mongoose = require("mongoose");

async function deleteItem(interaction, options) {
    // const id = options.get('id')?.value;
    const idItem = options.get("jeu")?.value;
    const seller = options.get("vendeur")?.user;
    const client = interaction.client;
    const author = interaction.member;

    const gameItem = await client.findGameItemShop({
        _id: new mongoose.Types.ObjectId(idItem),
    });
    logger.info(`.. Item ${gameItem[0]._id} choisi`);

    // Test si state n'existe pas
    if (gameItem[0].state) {
        return interaction.reply({
            embeds: [
                createError(
                    "L'item ne doit pas être encore en cours de vente ! Utiliser `/adminshop cancel <id>` ou `/shop admin refund <id>`",
                ),
            ],
        });
    }

    const gameName = gameItem[0].game.name;

    // Supprimer item boutique
    try {
        await client.deleteGameItemById(idItem);
    } catch (error) {
        return interaction.reply({
            embeds: [createError("Item du shop non trouvé !")],
        });
    }

    logger.info(`Suppression vente id ${gameName}`);

    const embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Item ${gameName} supprimé`);

    await interaction.reply({ embeds: [embed] });
    createLogs(
        client,
        interaction.guildId,
        "Suppression vente",
        `${author} a supprimé la vente de **${gameName}**, par **${seller}**`,
        `ID : ${idItem}`,
        YELLOW,
    );
}

exports.deleteItem = deleteItem;
