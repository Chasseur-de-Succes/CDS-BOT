const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../../util/envoiMsg");
const { YELLOW, NIGHT } = require("../../../../data/colors.json");
const { CHECK_MARK } = require("../../../../data/emojis.json");

async function cancel(interaction, options) {
    const id = options.get("id")?.value;
    const client = interaction.client;
    const author = interaction.member;

    // On récupère le premier élement car findGameItemShop retourne un tableau...
    const gameItem = await client.findGameItemShop({ _id: id })[0];

    if (gameItem.length === 0) {
        return interaction.reply({
            embeds: [createError("Vente non trouvée")],
        });
    }

    // Test si state existe et si != 'done'
    if (!gameItem.state) {
        return interaction.reply({
            embeds: [
                createError(
                    "La vente n'a pas encore **commencée** ! Utiliser `/adminshop delete <id>`",
                ),
            ],
        });
    }

    if (gameItem.state === "done") {
        return interaction.reply({
            embeds: [
                createError(
                    "La vente est déjà **terminée** ! Utiliser `/adminshop refund <id>`",
                ),
            ],
        });
    }

    await client.update(gameItem, { $unset: { state: 1, buyer: 1 } });

    try {
        // Enlève la restriction "1 achat tous les 2 jours"
        await client.update(gameItem.buyer, { $unset: { lastBuy: 1 } });

        // Rembourse acheteur
        await client.update(gameItem.buyer, {
            money: gameItem.buyer.money + gameItem.montant,
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
        .setDescription(`▶️ L'acheteur <@${gameItem.buyer.userId}> a été **remboursé**
                         ▶️ L'item est de nouveau **disponible** dans le shop`);
    interaction.reply({ embeds: [embed] });
    createLogs(
        client,
        interaction.guildId,
        "Annulation vente",
        `${author} a annulé la vente en cours de **${gameItem.game.name}**, par **${gameItem.seller.username}**`,
        `ID : ${id}`,
        YELLOW,
    );
}

exports.cancel = cancel;
