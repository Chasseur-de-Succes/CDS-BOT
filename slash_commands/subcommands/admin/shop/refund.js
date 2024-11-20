const { createError, createLogs } = require("../../../../util/envoiMsg");
const { EmbedBuilder } = require("discord.js");
const { YELLOW, NIGHT } = require("../../../../data/colors.json");
const { CHECK_MARK } = require("../../../../data/emojis.json");

async function refund(interaction, options) {
    const id = options.get("id")?.value;
    const client = interaction.client;
    const author = interaction.member;

    let gameItem = await client.findGameItemShop({ _id: id });

    if (gameItem.length === 0) {
        return interaction.reply({
            embeds: [createError("Vente non trouvée")],
        });
    }

    // on recup [0] car findGameItemShop retourne un array...
    gameItem = gameItem[0];

    // teste si state existe et si == 'done'
    if (!gameItem.state) {
        return interaction.reply({
            embeds: [
                createError(
                    "La vente n'a pas encore **commencée** ! Utiliser `/adminshop delete <id>`",
                ),
            ],
        });
    }

    if (gameItem.state !== "done") {
        return interaction.reply({
            embeds: [
                createError(
                    "La vente n'est pas encore **terminée** ! Utiliser `/adminshop cancel <id>`",
                ),
            ],
        });
    }

    // maj statut item
    await client.update(gameItem, { $unset: { state: 1, buyer: 1 } });

    // rembourse acheteur
    try {
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

    // reprend argent au vendeur
    try {
        await client.update(gameItem.seller, {
            money: gameItem.seller.money - gameItem.montant,
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
        .setDescription(`▶️ L'acheteur <@${gameItem.buyer.userId}> a été **remboursé**
                         ▶️ ${process.env.MONEY} **repris** au vendeur <@${gameItem.buyer.userId}> 
                         ▶️ L'item est de nouveau **disponible** dans le shop`);
    interaction.reply({ embeds: [embed] });
    createLogs(
        client,
        interaction.guildId,
        "Annulation vente",
        `${author} a annulé la vente, pour rembourser l'achat de **${gameItem.buyer.username}**, du jeu **${gameItem.game.name}**, vendu par **${gameItem.seller.username}**`,
        `ID : ${id}`,
        YELLOW,
    );
}

exports.refund = refund;
