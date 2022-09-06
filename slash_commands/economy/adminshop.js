const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const { MESSAGES } = require("../../util/constants");
const { createError, createLogs } = require("../../util/envoiMsg");
const { YELLOW, NIGHT } = require("../../data/colors.json");
const { CHECK_MARK } = require('../../data/emojis.json');
const { MONEY } = require('../../config.js');
const mongoose = require('mongoose');

module.exports.run = async (interaction) => {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'cancel') {
        cancel(interaction, interaction.options)
    } else if (subcommand === 'refund') {
        refund(interaction, interaction.options)
    } else if (subcommand === 'delete') {
        deleteItem(interaction, interaction.options)
    }
}

/* ADMIN */
async function cancel(interaction, options) {
    const id = options.get('id')?.value;
    const client = interaction.client;
    const author = interaction.member;
    
    let gameItem;
    try {
        gameItem = await client.findGameItemShop({ _id: id });
        if (gameItem.length === 0) throw `Non trouvée`;
    } catch (error) {
        return interaction.reply({ embeds: [createError(`Vente non trouvée`)] });
    }
    // on recup [0] car findGameItemShop retourne un array..
    gameItem = gameItem[0];

    // teste si state existe et si != 'done'
    if (!gameItem.state) return interaction.reply({ embeds: [createError(`La vente n'a pas encore **commencée** ! Utiliser \`/shop admin delete <id>\``)] });
    if (gameItem.state === 'done') return interaction.reply({ embeds: [createError(`La vente est déjà **terminée** ! Utiliser \`/shop admin refund <id>\``)] });

    await client.update(gameItem, { $unset : { state : 1, buyer: 1 } } )

    try {
        // enleve la restriction "1 achat tout les 2 jours"
        await client.update(gameItem.buyer, { $unset : { lastBuy : 1 } } )
        // rembourse acheteur
        await client.update(gameItem.buyer, { money: gameItem.buyer.money + gameItem.montant })
    } catch (error) {
        return interaction.reply({ embeds: [createError(`Acheteur non trouvé ! Impossible de le rembourser.`)] });
    }

    logger.info(`Annulation vente id ${id}`);
    
    let embed = new MessageEmbed()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Vente annulée !`)
        .setDescription(`▶️ L'acheteur <@${gameItem.buyer.userId}> a été **remboursé**
                         ▶️ L'item est de nouveau **disponible** dans le shop`);
    interaction.reply({ embeds: [embed] })
    createLogs(client, interaction.guildId, `Annulation vente`, `${author} a annulé la vente en cours de **${gameItem.game.name}**, par **${gameItem.seller.username}**`, `ID : ${id}`, YELLOW);
}

async function refund(interaction, options) {
    const id = options.get('id')?.value;
    const client = interaction.client;
    const author = interaction.member;
    
    let gameItem;
    try {
        gameItem = await client.findGameItemShop({ _id: id });
        if (gameItem.length === 0) throw `Non trouvée`;
    } catch (error) {
        return interaction.reply({ embeds: [createError(`Vente non trouvée`)] });
    }
    // on recup [0] car findGameItemShop retourne un array..
    gameItem = gameItem[0];

    // teste si state existe et si == 'done'
    if (!gameItem.state) return interaction.reply({ embeds: [createError(`La vente n'a pas encore **commencée** ! Utiliser \`/shop admin delete <id>\``)] });
    if (gameItem.state !== 'done') return interaction.reply({ embeds: [createError(`La vente n'est pas encore **terminée** ! Utiliser \`/shop admin cancel <id>\``)] });

    // maj statut item
    await client.update(gameItem, { $unset : { state : 1, buyer: 1 } } )

    // rembourse acheteur
    try {
        await client.update(gameItem.buyer, { money: gameItem.buyer.money + gameItem.montant })
    } catch (error) {
        return interaction.reply({ embeds: [createError(`Acheteur non trouvé ! Impossible de le rembourser.`)] });
    }

    // reprend argent au vendeur
    try {
        await client.update(gameItem.seller, { money: gameItem.seller.money - gameItem.montant })
    } catch (error) {
        return interaction.reply({ embeds: [createError(`Vendeur non trouvé ! Impossible de lui reprendre l'argent.`)] });
    }

    logger.info(`Remboursement vente id ${id}`);
    
    let embed = new MessageEmbed()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Achat remboursé !`)
        .setDescription(`▶️ L'acheteur <@${gameItem.buyer.userId}> a été **remboursé**
                         ▶️ ${MONEY} **repris** au vendeur <@${gameItem.buyer.userId}> 
                         ▶️ L'item est de nouveau **disponible** dans le shop`);
    interaction.reply({ embeds: [embed] })
    createLogs(client, interaction.guildId, `Annulation vente`, `${author} a annulé la vente, pour rembourser l'achat de **${gameItem.buyer.username}**, du jeu **${gameItem.game.name}**, vendu par **${gameItem.seller.username}**`, `ID : ${id}`, YELLOW);
}

async function deleteItem(interaction, options) {
    // const id = options.get('id')?.value;
    const idItem = options.get('jeu')?.value;
    const jeu = options.get('jeu')?.name;
    const vendeur = options.get('vendeur')?.user;
    const client = interaction.client;
    const author = interaction.member;

    const gameItem = await client.findGameItemShop({ _id: new mongoose.Types.ObjectId(idItem) });
    logger.info(`.. Item ${gameItem[0]._id} choisi`);

    // teste si state n'existe pas
    if (gameItem[0].state) return interaction.reply({ embeds: [createError(`L'item ne doit pas être encore en cours de vente ! Utiliser \`/shop admin cancel <id>\` ou \`/shop admin refund <id>\``)] });
    const gamename = gameItem[0].game.name;

    // suppr item boutique
    try {
        await client.deleteGameItemById(idItem);
    } catch (error) {
        return interaction.reply({ embeds: [createError(`Item du shop non trouvé !`)] });
    }

    logger.info(`Suppression vente id ${jeu}`);

    let embed = new MessageEmbed()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Item ${gamename} supprimé`);

    await interaction.reply({ embeds: [embed] })
    createLogs(client, interaction.guildId, `Suppression vente`, `${author} a supprimé la vente de **${gamename}**, par **${vendeur}**`, `ID : ${idItem}`, YELLOW);
    return;    
}

module.exports.help = MESSAGES.COMMANDS.ECONOMY.ADMINSHOP;