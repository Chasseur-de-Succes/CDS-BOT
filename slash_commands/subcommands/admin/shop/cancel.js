const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../../util/envoiMsg");
const { YELLOW, NIGHT } = require("../../../../data/colors.json");
const { CHECK_MARK } = require("../../../../data/emojis.json");
const { GameItemShopRepository, UserRepository } = require("../../../../repositories");

async function cancel(interaction, options) {
    const id = options.get("id")?.value;
    const client = interaction.client;
    const author = interaction.member;

    const gameItem = await GameItemShopRepository.findByIdWithRelations(id);

    if (!gameItem) {
        return interaction.reply({
            embeds: [createError("Vente non trouvée")],
        });
    }

    // Test si state existe et si != 'done'
    if (gameItem.state === "listed") {
        return interaction.reply({
            embeds: [
                createError(
                    "La vente n'a pas encore **commencée** ! Utiliser `/admin shop delete <id>`",
                ),
            ],
        });
    }

    if (gameItem.state === "done") {
        return interaction.reply({
            embeds: [
                createError(
                    "La vente est déjà **terminée** ! Utiliser `/admin shop refund <id>`",
                ),
            ],
        });
    }

    // Remet l'item "non vendu" (dispo dans le shop)
    await GameItemShopRepository.update(gameItem.id, {
        state: "listed",
        buyer: null,
    });

    try {
        if (!gameItem.buyerInfo) {
            throw new Error("buyer not found");
        }

        // Enlève la restriction "1 achat tous les 2 jours" + rembourse acheteur
        await UserRepository.update(gameItem.buyerInfo.id, {
            lastBuy: null,
            money: gameItem.buyerInfo.money + gameItem.price,
        });
    } catch (error) {
        return interaction.reply({
            embeds: [
                createError(
                    "Acheteur non trouvé ! Impossible de le rembourser.",
                ),
            ],
        });
    }

    logger.info(`Annulation vente id ${id}`);

    const embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Vente annulée !`)
        .setDescription(`▶️ L'acheteur <@${gameItem.buyerInfo.discordId}> a été **remboursé**
                         ▶️ L'item est de nouveau **disponible** dans le shop`);
    interaction.reply({ embeds: [embed] });
    createLogs(
        client,
        interaction.guildId,
        "Annulation vente",
        `${author} a annulé la vente en cours de **${gameItem.gameInfo.name}**, par **${gameItem.sellerInfo.username}**`,
        `ID : ${id}`,
        YELLOW,
    );
}

exports.cancel = cancel;
