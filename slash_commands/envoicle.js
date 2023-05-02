const { EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const { YELLOW } = require("../data/colors.json");
const { createError, feedBotMetaAch } = require('../util/envoiMsg');
const { GameItem } = require('../models');
const { getAchievement } = require('../util/msg/stats');
const { createLogs } = require('../util/envoiMsg');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('envoi-cle')
        .setDescription(`Envoi ta clé steam à l'acheteur`)
        .setDMPermission(true)
        .addStringOption(option => option.setRequired(true).setName('cle').setDescription('La clé Steam à envoyer')),
    async execute(interaction) {
        const client = interaction.client;
        const daKey = interaction.options.get('cle')?.value;
        let vendeur = interaction.user;
        const isInGuild = interaction.inGuild();

        // recupere l'user dans la db
        const vendeurDB = await client.getUser(vendeur);
        if (!vendeurDB) // Si pas dans la BDD
            return interaction.reply({ embeds: [createError(`${vendeur.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

        // cherche l'item en 'pending'
        // TODO mettre les items en 'pending' lors de l'achat
        let items = await client.findGameItemShop({ seller: vendeurDB, state: 'pending' });
        
        let embed = new EmbedBuilder();
        
        if (items.length === 0) {
            embed.setDescription(`Pas de jeu en cours de vente`)
            return interaction.reply({ embeds: [embed], ephemeral: isInGuild });
        } else if (items.length > 1) {
            //await interaction.deferReply();

            // TODO si plusieurs item
            let itemsSelect = [];
            items.forEach(i => {
                itemsSelect.push({
                    label: i.game.name,
                    description: `acheté par ${i.buyer.username}`,
                    value: '' + i._id
                })
            });

            const select = new StringSelectMenuBuilder()
                .setCustomId('acheteurs')
                .setPlaceholder('Quel item ?')
                .addOptions(itemsSelect);

            const row = new ActionRowBuilder()
                .addComponents(select);

            let msgEmbed = await interaction.reply({
                content: `Plusieurs jeux en cours de vente !\nPour quel **jeu** et pour **qui** est cette clé ?`,
                components: [row],
                ephemeral: isInGuild
            });

            // attend une interaction bouton de l'auteur de la commande
            let filter, itrSelect;
            try {
                filter = i => {
                    i.deferUpdate();
                    return i.user.id === interaction.user.id;
                };
                itrSelect = await msgEmbed.awaitMessageComponent({
                    filter,
                    time: 30000 // 5min
                });
            } catch (error) {
                // a la fin des 5min, on enleve le select
                await interaction.editReply({ components: [] })
                return;
            }
            // on enleve le select
            await interaction.editReply({ components: [] })
            
            const idItem = itrSelect.values[0];
            
            const item = await GameItem.findById(idItem).populate('game seller buyer');
            embed = await sendKey(client, vendeur, vendeurDB, item, daKey);
            
            await interaction.editReply({ embeds: [embed], components: [], ephemeral: isInGuild });
        } else if (items.length === 1) {
            const item = items[0];
            
            embed = await sendKey(client, vendeur, vendeurDB, item, daKey);
            
            return interaction.reply({ embeds: [embed], ephemeral: isInGuild });
        }
    },
}

async function sendKey(client, vendeur, vendeurDB, item, daKey) {
    let embed = new EmbedBuilder();

    const guildId = item.guildId;
    const buyerDB = item.buyer;
    const game = item.game;

    const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;

    // recherche de l'acheteur
    const guild = await client.guilds.cache.get(guildId);
    const acheteur = guild.members.cache.get(buyerDB.userId);

    // si acheteur trouvé
    // TODO si error lors envoi message (acheteur a bloqué MP ou X raison)
    // TODO si envoi ok, msg confirmation, sinon msg erreur 
    if (acheteur) {
        const acheteurDB = await client.getUser(acheteur);

        // - envoi cle a l'acheteur
        let KDOembed = new EmbedBuilder()
            .setTitle('💰 BOUTIQUE - LA CLÉ 💰')
            .setThumbnail(gameUrlHeader)
            .setColor(YELLOW)
            .setDescription(`${vendeur} t'envoie la clé pour le jeu ***${game.name}*** :

            ⬇️⬇️⬇️
            **${daKey}**
            ⬆️⬆️⬆️

            🙏 Merci d'avoir utilisé CDS Boutique !
            N'hésitez pas de nouveau à claquer votre pognon dans **2 jours** ! 🤑
            
            *En cas de problème, contactez un admin !*`);
        await acheteur.send({ 
            embeds: [KDOembed]
        });
        
        // maj state
        await client.update(item, { state: 'done' });

        // maj stat vendeur & acheteur
        vendeurDB.stats.shop.sold++;
        acheteurDB.stats.shop.bought++;

        // test si achievement unlock
        const achievementUnlock = await getAchievement(vendeurDB, 'shop');
        if (achievementUnlock) {
            feedBotMetaAch(client, guildId, vendeur, achievementUnlock);
        }

        // save
        await vendeurDB.save();
        await acheteurDB.save();

        // log 'Acheteur a confirmé et à reçu la clé JEU en MP - done'
        createLogs(client, guildId, `Achat jeu dans le shop`, `~~1️⃣ ${acheteur} achète **${game.name}** à **${item.montant} ${process.env.MONEY}**~~
                                            2️⃣ ${vendeur} a envoyé la clé & ${acheteur} a reçu la clé ! C'est terminé !`, `ID vente : ${item._id}`, YELLOW);

        // ajoute montant du jeu au porte-monnaie du vendeur
        vendeurDB.money += item.montant;
        await client.update(vendeurDB, { money: vendeurDB.money });

        // TODO demander confirmation à l'acheteur ?

        embed.setTitle('💰 BOUTIQUE - VENTE FINIE 💰')
            .setDescription(`${acheteur} a reçu la clé du jeu ***${game.name}*** que vous aviez mis en vente !
    
                Vous avez bien reçu vos ***${item.montant} ${process.env.MONEY}***, ce qui vous fait un total de ...
                💰 **${vendeurDB.money} ${process.env.MONEY}** !
                
                *En cas de problème, contactez un admin !*`);
        
    }
    return embed;
}