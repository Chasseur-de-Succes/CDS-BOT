const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../util/envoiMsg");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { NIGHT, YELLOW } = require("../../../data/colors.json");
const { GameItemShopRepository } = require("../../../repositories");

async function remove(interaction, options) {
    const gameItemId = options.get("jeu")?.value;
    const client = interaction.client;
    const author = interaction.member;
    const guild = interaction.guild;

    await interaction.deferReply();

    if (!Number.parseInt(gameItemId)) {
        return interaction.editReply({
            embeds: [createError("Jeu non valide !")],
        });
    }

    const gameItem = await GameItemShopRepository.findByIdWithRelations(gameItemId);
    logger.info(`.. Item ${gameItem.id} choisi`);

    // Test si bien le vendeur
    const seller = guild.members.cache.get(gameItem.sellerInfo.discordId);
    if (author !== seller) {
        return interaction.editReply({
            embeds: [createError("Tu n'es pas le vendeur du jeu !")],
        });
    }

    // Test si state n'existe pas
    if (gameItem.state === 'pending') {
        return interaction.editReply({
            embeds: [
                createError("Le jeu ne peut pas avoir une demande d'achat !"),
            ],
        });
    }

    const gameName = gameItem.gameInfo.name;

    // Supprimer item boutique
    try {
        await GameItemShopRepository.delete(gameItemId);
    } catch (error) {
        return interaction.editReply({
            embeds: [createError("Item du shop non trouvé !")],
        });
    }

    logger.info(`Suppression vente id ${gameName}`);

    const embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Jeu ${gameName} supprimé`);

    await interaction.editReply({ embeds: [embed] });
    createLogs(
        client,
        interaction.guildId,
        "Jeu retiré dans le shop",
        `${author} vient de retirer **${gameName}**`,
        `ID : ${gameItemId}`,
        YELLOW,
    );
}

exports.remove = remove;
