const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createError, createLogs } = require("../util/envoiMsg");
const { YELLOW, NIGHT } = require("../data/colors.json");
const { CHECK_MARK } = require('../data/emojis.json');
const mongoose = require('mongoose');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminshop')
        .setDescription('Gestion de la boutique')
        .addSubcommand(sub =>
            sub
                .setName('cancel')
                .setDescription("Annule une transaction **en cours**")
                .addStringOption(option => option.setName('id').setDescription("ID de la transaction (récupéré dans msg log)").setRequired(true)))
        .addSubcommand(sub =>
            sub
                .setName('refund')
                .setDescription("Rembourse une transaction **terminé**")
                .addStringOption(option => option.setName('id').setDescription("ID de la transaction (récupéré dans msg log)").setRequired(true)))
        .addSubcommand(sub =>
            sub
                .setName('delete')
                .setDescription("Supprime un item du shop")
                .addUserOption(option => option.setName('vendeur').setDescription('Le vendeur').setRequired(true))
                .addStringOption(option => option.setName('jeu').setDescription("Nom du jeu").setAutocomplete(true).setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction) {
        // cmd adminshop delete, autocomplete sur nom jeu
        const client = interaction.client;
        const focusedValue = interaction.options.getFocused(true);
        const vendeurId = interaction.options.get('vendeur')?.value;

        let filtered = [];
        
        if (focusedValue.name === 'jeu') {
            if (focusedValue.value)
                filtered = await client.findGameItemShopBy({ game: focusedValue.value, seller: vendeurId, notSold: true, limit: 25 });
            else
                filtered = await client.findGameItemShopBy({ seller: vendeurId, notSold: true, limit: 25 });
        }

        await interaction.respond(
            // on ne prend que les 25 1er  (au cas où)
            filtered.slice(0, 25).map(choice => ({ name: choice.game.name, value: choice._id })),
        );
    },
    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin)
            return interaction.reply({ embeds: [createError(`Tu n'as pas le droit d'exécuter cette commande !`)], ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'cancel') {
            cancel(interaction, interaction.options)
        } else if (subcommand === 'refund') {
            refund(interaction, interaction.options)
        } else if (subcommand === 'delete') {
            deleteItem(interaction, interaction.options)
        }
    },
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
    if (!gameItem.state) return interaction.reply({ embeds: [createError(`La vente n'a pas encore **commencée** ! Utiliser \`/adminshop delete <id>\``)] });
    if (gameItem.state === 'done') return interaction.reply({ embeds: [createError(`La vente est déjà **terminée** ! Utiliser \`/adminshop refund <id>\``)] });

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
    
    let embed = new EmbedBuilder()
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
    if (!gameItem.state) return interaction.reply({ embeds: [createError(`La vente n'a pas encore **commencée** ! Utiliser \`/adminshop delete <id>\``)] });
    if (gameItem.state !== 'done') return interaction.reply({ embeds: [createError(`La vente n'est pas encore **terminée** ! Utiliser \`/adminshop cancel <id>\``)] });

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
    
    let embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Achat remboursé !`)
        .setDescription(`▶️ L'acheteur <@${gameItem.buyer.userId}> a été **remboursé**
                         ▶️ ${process.env.MONEY} **repris** au vendeur <@${gameItem.buyer.userId}> 
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
    if (gameItem[0].state) return interaction.reply({ embeds: [createError(`L'item ne doit pas être encore en cours de vente ! Utiliser \`/adminshop cancel <id>\` ou \`/shop admin refund <id>\``)] });
    const gamename = gameItem[0].game.name;

    // suppr item boutique
    try {
        await client.deleteGameItemById(idItem);
    } catch (error) {
        return interaction.reply({ embeds: [createError(`Item du shop non trouvé !`)] });
    }

    logger.info(`Suppression vente id ${jeu}`);

    let embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`${CHECK_MARK} Item ${gamename} supprimé`);

    await interaction.reply({ embeds: [embed] })
    createLogs(client, interaction.guildId, `Suppression vente`, `${author} a supprimé la vente de **${gamename}**, par **${vendeur}**`, `ID : ${idItem}`, YELLOW);
    return;    
}