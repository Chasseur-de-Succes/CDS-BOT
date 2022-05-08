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

    await client.update(gameItem, { $unset : { state : 1} } )
    logger.info(`Annulation vente id ${id}`);
    // TODO embed plutot qu'emoji (car on peut pas juste react je crois)
    interaction.reply(CHECK_MARK)
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
    // TODO embed plutot qu'emoji (car on peut pas juste react je crois)
    interaction.reply(CHECK_MARK)
    createLogs(client, interaction.guildId, `Annulation vente`, `${author} a annulé la vente, pour rembourser l'achat de **${gameItem.buyer.username}**, du jeu **${gameItem.game.name}**, vendu par **${gameItem.seller.username}**`, `ID : ${id}`, YELLOW);
}

async function deleteItem(interaction, options) {
    // const id = options.get('id')?.value;
    const jeu = options.get('jeu')?.value;
    const vendeur = options.get('vendeur')?.user;
    const client = interaction.client;
    const author = interaction.member;
    
    // recup list item (pas encore vendu) en fonction vendeur ET jeu
    let items = await client.findGameItemShopBy({ game: jeu, seller: vendeur.id, notSold: true });
    items = items.map(i => ({ label: `${i.game.name}, vendu par ${i.seller.username}, à ${i.montant} ${MONEY}`, value: '' + i._id}))

    // row contenant le Select menu
    const row = new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('select-items-' + author)
            .setPlaceholder(`Sélectionner l'item à supprimer..`)
            .addOptions(items)
    );
    let embed = new MessageEmbed()
        .setColor(NIGHT)
        .setTitle(`Quel item à supprimer ?`);
    
    let msgEmbed = await interaction.reply({embeds: [embed], components: [row], fetchReply: true});

    // TODO choix select : delete
    let filter, itr;
    try {
        filter = i => {return i.user.id === author.id}
        itr = await msgEmbed.awaitMessageComponent({
            filter,
            componentType: 'SELECT_MENU',
            time: 30000 // 5min
        });
    } catch (error) {
        msgEmbed.edit({ components: [] })
        return;
    }
    // on enleve le select
    await interaction.editReply({ components: [] })

    const id = itr.values[0]
    const gameItem = await client.findGameItemShop({ _id: new mongoose.Types.ObjectId(id) });
    logger.info(`.. Item ${gameItem[0]._id} choisi`);

    // teste si state n'existe pas
    if (gameItem[0].state) return interaction.editReply({ embeds: [createError(`L'item ne doit pas être encore en cours de vente ! Utiliser \`/shop admin cancel <id>\` ou \`/shop admin refund <id>\``)] });
   
    // suppr item boutique
    try {
        await client.deleteGameItemById(id);
    } catch (error) {
        return interaction.editReply({ embeds: [createError(`Item du shop non trouvé !`)] });
    }

    logger.info(`Suppression vente id ${id}`);
    // TODO embed plutot qu'emoji (car on peut pas juste react je crois)
    embed.setTitle(`${CHECK_MARK} Item supprimé`)
    await interaction.editReply({ embeds: [embed] })
    createLogs(client, interaction.guildId, `Suppression vente`, `${author} a supprimé la vente de **${jeu}**, par **${vendeur}**`, `ID : ${id}`, YELLOW);
    return;    
}

module.exports.help = MESSAGES.COMMANDS.ECONOMY.ADMINSHOP;