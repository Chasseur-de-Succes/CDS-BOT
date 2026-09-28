const { createError, createLogs } = require("../../../../util/envoiMsg");
const { EmbedBuilder } = require("discord.js");
const { YELLOW, NIGHT } = require("../../../../data/colors.json");
const { CHECK_MARK } = require("../../../../data/emojis.json");
const { GameItemShopRepository, UserRepository } = require("../../../../repositories");

async function refund(interaction, options) {
    const id = options.get("id")?.value;
    const client = interaction.client;
    const author = interaction.member;

    const gameItem = await GameItemShopRepository.findByIdWithRelations(id);

    if (!gameItem) {
        return interaction.reply({
            embeds: [createError("Vente non trouvée")],
        });
    }

    // teste si state existe et si == 'done'
    if (gameItem.state !== "done") {
        return interaction.reply({
            embeds: [
                createError(
                    "La vente n'est pas encore **terminée** ! Utiliser `/admin shop cancel <id>`",
                ),
            ],
        });
    }

    // Remet l'item (dispo dans le shop)
    await GameItemShopRepository.update(gameItem.id, {
        state: "listed",
        buyer: null,
    });

    // rembourse acheteur
    try {
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

    // reprend argent au vendeur
    try {
        await UserRepository.update(gameItem.sellerInfo.id, {
            money: gameItem.sellerInfo.money - gameItem.price,
        });
    } catch (error) {
        return interaction.reply({
            embeds: [
                createError(
                    "Vendeur non trouvé ! Impossible de lui reprendre l'argent.",
                ),
            ],
        });
    }

    logger.info(`Remboursement vente id ${id}`);

    const embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Achat remboursé !`)
        .setDescription(`▶️ L'acheteur <@${gameItem.buyerInfo.discordId}> a été **remboursé**
                         ▶️ ${process.env.MONEY} **repris** au vendeur <@${gameItem.sellerInfo.discordId}> 
                         ▶️ L'item est de nouveau **disponible** dans le shop`);
    interaction.reply({ embeds: [embed] });
    createLogs(
        client,
        interaction.guildId,
        "Annulation vente",
        `${author} a annulé la vente, pour rembourser l'achat de **${gameItem.buyerInfo.username}**, du jeu **${gameItem.gameInfo.name}**, vendu par **${gameItem.sellerInfo.username}**`,
        `ID : ${id}`,
        YELLOW,
    );
}

exports.refund = refund;
