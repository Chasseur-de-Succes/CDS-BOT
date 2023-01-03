const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { createError, createLogs, sendMPAchievement } = require("../util/envoiMsg");
const { YELLOW, NIGHT, GREEN, DARK_RED } = require("../data/colors.json");
const customItems = require("../data/customShop.json");
const { CHECK_MARK, NO_SUCCES } = require('../data/emojis.json');
const moment = require('moment');
const { User, Game } = require('../models');
const { escapeRegExp, getJSONValue } = require('../util/util');
const { getAchievement } = require('../util/msg/stats');

const NB_PAR_PAGES = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Affiche la boutique')
        .addSubcommand(sub =>
            sub
                .setName('list')
                .setDescription("Liste les jeux achetable"))
        .addSubcommand(sub =>
            sub
                .setName('jeux')
                .setDescription("Ouvre le shop (Jeux)")
                .addIntegerOption(option => option.setName('page').setDescription('N° de page du shop')))
        .addSubcommand(sub =>
            sub
                .setName('custom')
                .setDescription("Ouvre le shop (personnalisation)")
                .addStringOption(option => option.setName('type').setDescription("Type d'item").setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub
                .setName('sell')
                .setDescription("Vend une clé Steam")
                .addStringOption(option => option.setName('jeu').setDescription("Nom du jeu").setRequired(true).setAutocomplete(true))      
                .addIntegerOption(option => option.setName('prix').setDescription('Prix du jeu (en ' + process.env.MONEY + ')').setRequired(true)))       
        ,
    async autocomplete(interaction) {
        if (interaction.commandName === 'shop') {
            if (interaction.options.getSubcommand() === 'custom') {
                let filtered = [];
                for (let x in customItems) {
                    filtered.push({
                        name: customItems[x].title,
                        // description: 'Description',
                        value: '' + x
                    });
                }
                
                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.value })),
                );
            } else if (interaction.options.getSubcommand() === 'sell') {
                const focusedValue = interaction.options.getFocused(true);
                let filtered = [];
                let exact = [];
    
                // cmd group create, autocomplete sur nom jeu
                if (focusedValue.name === 'jeu') {
                    // recherche nom exacte
                    exact = await interaction.client.findGames({
                        name: focusedValue.value,
                        type: 'game'
                    });
    
                    // recup limit de 25 jeux, correspondant a la value rentré
                    filtered = await Game.aggregate([{
                        '$match': { 'name': new RegExp(escapeRegExp(focusedValue.value), "i") }
                    }, {
                        '$match': { 'type': 'game' }
                    }, {
                        '$limit': 25
                    }])
    
                    // filtre nom jeu existant ET != du jeu exact trouvé (pour éviter doublon)
                    // limit au 25 premiers
                    // si nom jeu dépasse limite imposé par Discord (100 char)
                    // + on prepare le résultat en tableau de {name: '', value: ''}
                    filtered = filtered
                        .filter(jeu => jeu.name && jeu.name !== exact[0]?.name)
                        .slice(0, 25)
                        .map(element => ({
                            name: element.name?.length > 100 ? element.name.substr(0, 96) + '...' : element.name,
                            value: "" + element.appid
                        }));
                }
    
                // si nom exact trouvé
                if (exact.length === 1) {
                    const jeuExact = exact[0]
                    // on récupère les 24 premiers
                    filtered = filtered.slice(0, 24);
                    // et on ajoute en 1er l'exact
                    filtered.unshift({ name: jeuExact.name, value: "" + jeuExact.appid })
                }
    
                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.value })),
                );
            }
        }
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            listGames(interaction, interaction.options);
        } else if (subcommand === 'jeux') {
            list(interaction, interaction.options, true);
        } else if (subcommand === 'custom') {
            listCustom(interaction, interaction.options);
        } else if (subcommand === 'sell') {
            sell(interaction, interaction.options)
        }
    },
}

const list = async (interaction, options, showGame = false) => {
    let nbPage = options.get('page') ? options.get('page').value - 1 : 0;
    const client = interaction.client;
    const guild = interaction.guild;
    let author = interaction.member;

    // "Bot réfléchit.."
    await interaction.deferReply();

    let userDB = await client.getUser(author);
    if (!userDB)
        return interaction.editReply({ embeds: [createError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`/register\``)] });

    let infos = {};
    infos.money = userDB.money;
    
    if (showGame) { // Si JEUX
        infos.soustitre = 'JEUX';
        infos.type = 0;
        // recupere array d'info sur jeux à vendre
        // [0]._id -> Game
        // [0].items -> GameItemShop
        infos.items = await client.findGameItemShopByGame();
    } else { // Si CUSTOM
        infos.soustitre = 'TUNNING';
        infos.type = 1;
        // TODO définir fonction à appeler lorsqu'on achete ? similaire à Job
        // TODO pas pareil que game
    }
    
    const max = infos.items?.length ?? 0;
    // si 0 item dispo
    if (showGame && max === 0) 
        return interaction.editReply({ embeds: [createError(`Désolé, aucun item n'est actuellement en vente !`)] });
        
    // teste si index nbPages existe
    if (nbPage < 0 || nbPage >= max)
        return interaction.editReply({ embeds: [createError(`Oh là, il n'y a pas autant de pages que ça !`)] });
    let currentIndex = nbPage;

    // row pagination
    const prevBtn = new ButtonBuilder()
        .setCustomId("prev")
        .setLabel('Préc.')
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(nbPage == 0);
    const nextBtn = new ButtonBuilder()
        .setCustomId("next")
        .setLabel('Suiv.')
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(nbPage + 1 == max);
    const buyBtn = new ButtonBuilder()
        .setCustomId("buy")
        .setLabel('Acheter')
        .setEmoji('💸')
        .setStyle(ButtonStyle.Danger)
        // TODO a modifier une fois boutique custom faite
        .setDisabled(infos.type == 1 || (userDB.money < infos.items[currentIndex].items[0].montant))
    const rowBuyButton = new ActionRowBuilder()
        .addComponents(
            prevBtn,
            nextBtn,
            buyBtn
        );

    // on envoie créer et envoie le message du shop
    // TODO msg différent pour jeux / custom ?
    let shopEmbed = createShop(guild, infos, nbPage);
    let msgShopEmbed = await interaction.editReply({embeds: [shopEmbed], components: [rowBuyButton], fetchReply: true});
    
    // Collect button interactions
    const collector = msgShopEmbed.createMessageComponentCollector({
        filter: ({ user }) => user.id === author.id,
        time: 300000 // 5min
    })
    
    collector.on('collect', async itr => {
        // si bouton 'prev' ou 'next' (donc pas 'buy')
        if (itr.customId !== 'buy') {
            itr.customId === 'prev' ? (currentIndex -= 1) : (currentIndex += 1)
            // disable si 1ere page
            prevBtn.setDisabled(currentIndex == 0)
            // disable next si derniere page
            nextBtn.setDisabled(currentIndex + 1 == max)
            // disable buy si pas assez argent
            buyBtn.setDisabled(userDB.money < infos.items[currentIndex].items[0].montant)

            // Respond to interaction by updating message with new embed
            await itr.update({
                embeds: [createShop(guild, infos, currentIndex)],
                components: [new ActionRowBuilder( { components: [prevBtn, nextBtn, buyBtn] } )]
            })
        } else {
            // achete item courant
            if (infos.type == 0) {
                const items = infos.items[currentIndex]
                const vendeur = guild.members.cache.get(items.items[0].seller.userId);

                // empeche l'achat de son propre jeu
                if (items.items[0].seller.userId === userDB.userId) {
                    return itr.reply({ embeds: [createError(`Tu ne peux pas acheter ton propre jeu !`)], ephemeral: true });
                }

                // empeche l'achat si - de 2j
                const nbDiffDays = Math.abs(moment(userDB.lastBuy).diff(moment(), 'days'));
                if (userDB.lastBuy && nbDiffDays <= 2) {
                    collector.stop();
                    return itr.reply({ embeds: [createError(`Tu dois attendre au mois 2 jours avant de pouvoir racheter un jeu !`)], ephemeral: true });
                }

                // ACHETE !
                buyGame(client, interaction.guildId, author, userDB, vendeur, items);

                // message recap
                let recapEmbed = new EmbedBuilder()
                    .setColor(YELLOW)
                    .setTitle(`💰 BOUTIQUE - ${infos.soustitre} - RECAP' 💰`)
                    .setDescription(`${CHECK_MARK} ${author}, vous venez d'acheter **${items._id.name}** à **${items.items[0].montant}** ${process.env.MONEY}
                        ${vendeur} a reçu un **DM**, dès qu'il m'envoie la clé, je te l'envoie !

                        *En cas de problème, n'hésitez pas à contacter un **admin***.`)
                    .setFooter({text: `💵 ${userDB.money - items.items[0].montant} ${process.env.MONEY}`});
                
                // maj du msg, en enlevant boutons actions
                await itr.update({ 
                    embeds: [recapEmbed],
                    components: [] 
                })
            } else if (infos.type == 1) {
                // achat custom
            }
        }
    })

    // apres 5 min, on "ferme" la boutique
    collector.on('end', collected => {
        msgShopEmbed.edit({
            embeds: [createShop(guild, infos, currentIndex)],
            components: []
        })
    });
}

/* CUSTOM */
async function listCustom(interaction, options) {
    let type = options.get('type').value;
    const client = interaction.client;
    const guild = interaction.guild;
    let author = interaction.member;

    // "Bot réfléchit.."
    await interaction.deferReply();

    let userDB = await client.getUser(author);
    if (!userDB)
        return interaction.editReply({ embeds: [createError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`/register\``)] });

    // type : ["text", "border", ...]
    logger.info(`.. Item '${type}' choisi`);

    // edit embed: choix parmis élément dans customItems[type].value

    createChoixCustom(interaction, userDB, type, customItems);
}
async function createChoixCustom(interaction, userDB, type, customItems) {
    let itemsSelect = [];
    for (let x in customItems[type].values) {
        const nom = customItems[type].values[x].name;
        const prix = customItems[type].values[x].price

        itemsSelect.push({
            label: '💰 ' + prix + ' : ' + nom,
            value: x
        });
    }
    const rowItem = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('custom-item-' + type)
            .setPlaceholder(`Choisir l'élément à acheter..`)
            .addOptions(itemsSelect)
    );
    
    let embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`💰 BOUTIQUE - PROFILE 💰`)
        .setDescription(`Quel élément voulez-vous acheter ?`)
        .setFooter({ text: `💵 ${userDB.money} ${process.env.MONEY}`});
      
    let msgEmbed = await interaction.editReply({ embeds: [embed], components: [rowItem]});

    // attend une interaction bouton de l'auteur de la commande
    let filter, itrSelect;
    try {
        filter = i => {
            i.deferUpdate();
            return i.user.id === interaction.user.id;
        };
        itrSelect = await msgEmbed.awaitMessageComponent({
            filter,
            componentType: 'SELECT_MENU',
            time: 30000 // 5min
        });
    } catch (error) {
        // a la fin des 5min, on enleve le select
        await interaction.editReply({ components: [] })
        return;
    }
    // on enleve le select
    await interaction.editReply({ components: [] })
    const value = itrSelect.values[0];

    // on créé l'apercu avec l'option d'achat
    createAchatCustom(interaction, userDB, type, customItems, value);
}
async function createAchatCustom(interaction, userDB, type, customItems, value) {
    const dbConfig = customItems[type].db
    const finalVal = customItems[type].values[value];

    // TODO image ?

    // boutons
    // const backBtn = new MessageButton()
    //     .setCustomId("back")
    //     .setLabel('Retour')
    //     .setEmoji('⬅️')
    //     .setStyle('PRIMARY')

    // recup settings de l'user 
    const configProfile = await interaction.client.getOrInitProfile(userDB);
    // - si user a déjà acheté => "Utiliser" "enabled"
    let bought = typeof getJSONValue(configProfile, dbConfig, new Map()).get(value) !== 'undefined'

    const buyBtn = new ButtonBuilder()
        .setCustomId("buy")
        .setLabel(`${bought ? 'Utiliser' : 'Acheter'}`)
        .setEmoji(`${bought ? '✅' : '💸'}`)
        .setStyle(`${bought ? ButtonStyle.Primary : ButtonStyle.Danger }`)
        .setDisabled(`${bought ? false : (userDB.money < finalVal.price) }`)

    let embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(`💰 BOUTIQUE - PROFILE - PRÉVISUALISATION 💰`)
        .setDescription(`${finalVal.name}
        💰 ${finalVal.price}`)
        .setFooter({ text: `💵 ${userDB.money} ${process.env.MONEY}`});

    const row = new ActionRowBuilder()
        .addComponents(
            // backBtn,
            buyBtn
        );
    
    let msgCustomEmbed = await interaction.editReply({embeds: [embed], components: [row], fetchReply: true});

    // Collect button interactions
    const collector = msgCustomEmbed.createMessageComponentCollector({
        filter: ({ user }) => user.id === interaction.member.id,
        time: 300000 // 5min
    })

    collector.on('collect', async itr => {
        // on recréé le message 
        if (itr.customId === 'buy') {
            if (value === 'custom') {
                // - si custom, attente d'un message de l'user
                embed = new EmbedBuilder()
                    .setColor(NIGHT)
                    .setTitle(`En attente de ta couleur..`)
                    .setDescription(`Quelle couleur souhaites-tu pour ***${customItems[type].title}*** ?
                        Réponds ta couleur au format héxadécimal ! (ex: #008000 (vert))`)
                    .setFooter({ text: `💵 ${userDB.money} ${process.env.MONEY}`});

                await interaction.editReply({embeds: [embed], components: []});

                // TODO refactor.. doublons un peu
                try {
                    let filter = m => { return m.author.id === interaction.member.id }
                    let response = await msgCustomEmbed.channel.awaitMessages({ filter, max: 1, time: 300000 });
                    let daColor = response.first().content;
                    
                    // regex #000 ou #000000
                    if (daColor.match(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/)){
                        // MAJ
                        daColor = daColor.toUpperCase();

                        // si couleur déjà présente ?
                        bought = typeof getJSONValue(configProfile, dbConfig, new Map()).get(daColor) !== 'undefined'

                        // sinon on achete/utilise
                        const query = { userId: userDB.userId };
                        var update = { $set : {} };
        
                        // on met a false toutes les options (s'il y en a)
                        getJSONValue(configProfile, dbConfig, new Map())
                            .forEach(async (value, key) => {
                                update.$set["profile." + dbConfig + "." + key] = false;
                                await User.findOneAndUpdate(query, update)
                            })

                        // maj config user
                        update = { $set : {} };
                        update.$set["profile." + dbConfig + "." + daColor] = true;
                        await User.findOneAndUpdate(query, update)

                        // si pas acheté, on enleve argent
                        if (!bought) {
                            await interaction.client.update(userDB, { 
                                money: userDB.money - finalVal.price
                            });

                            // log 
                            createLogs(interaction.client, interaction.guildId, `Argent perdu`, `${interaction.member} achète ***${finalVal.name}*** pour ***${customItems[type].title}***`);
                        }

                        embed = new EmbedBuilder()
                            .setColor(GREEN)
                            .setTitle(`💰 BOUTIQUE - PROFILE 💰`)
                            .setDescription(`***${daColor}*** pour ***${customItems[type].title}*** ${bought ? "sélectionnée" : "achetée"} !
                                Va voir sur ton profile ! \`/profile\``)
                            .setFooter({ text: `💵 ${userDB.money} ${process.env.MONEY}`});

                        // reply
                        await interaction.editReply({embeds: [embed], components: []});
                    } else {
                        embed = new EmbedBuilder()
                            .setColor(DARK_RED)
                            .setTitle(`Erreur`)
                            .setDescription(`La couleur n'est pas au bon format ! (format hexa)
                                Pour retenter, il faut relancer la commande !`)
                            .setFooter({ text: `💵 ${userDB.money} ${process.env.MONEY}`});
    
                        await interaction.editReply({embeds: [embed], components: []});
                    }

                    // TODO ajout config user
                } catch(err) {
                    logger.error(err)
                    embed = new EmbedBuilder()
                        .setColor(DARK_RED)
                        .setTitle(`Erreur`)
                        .setDescription(`Petit soucis, essaie de renseigner à temps ! ou bien vérifier si la couleur existe (format HEX)`)
                        .setFooter({ text: `💵 ${userDB.money} ${process.env.MONEY}`});

                    await interaction.editReply({embeds: [embed], components: []});
                }
            } else {
                // sinon on achete/utilise
                const query = { userId: userDB.userId };
                var update = { $set : {} };

                // on met a false toutes les options (s'il y en a)
                getJSONValue(configProfile, dbConfig, new Map())
                    .forEach(async (value, key) => {
                        update.$set["profile." + dbConfig + "." + key] = false;
                        await User.findOneAndUpdate(query, update)
                    })
                
                // maj config user
                update = { $set : {} };
                update.$set["profile." + dbConfig + "." + value] = true;
                await User.findOneAndUpdate(query, update)

                // si pas acheté, on enleve argent
                if (!bought) {
                    await interaction.client.update(userDB, { 
                        money: userDB.money - finalVal.price
                    });

                    // log 
                    createLogs(interaction.client, interaction.guildId, `Argent perdu`, `${interaction.member} achète ***${finalVal.name}*** pour ***${customItems[type].title}***`);
                }

                embed = new EmbedBuilder()
                    .setColor(GREEN)
                    .setTitle(`💰 BOUTIQUE - PROFILE 💰`)
                    .setDescription(`***${finalVal.name}*** pour ***${customItems[type].title}*** ${bought ? "sélectionnée" : "achetée"} !
                        Va voir sur ton profile ! \`/profile\``)
                    .setFooter({ text: `💵 ${userDB.money} ${process.env.MONEY}`});

                // reply
                await interaction.editReply({embeds: [embed], components: []});
            }
        }
    });

    // apres 5 min, on "ferme" 
    collector.on('end', collected => {
        msgCustomEmbed.edit({
            embeds: [embed],
            components: []
        })
    });
}
/* --- */

function createShop(guild, infos, currentIndex = 0) {
    let embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle(`💰 BOUTIQUE - ${infos.soustitre} 💰`)
    // JEUX
    if (infos.type == 0) {
        const game = infos.items[currentIndex]._id;
        const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
        const items = infos.items[currentIndex].items
        
        const steamLink = `[Steam](https://steamcommunity.com/app/${game.appid})`;
        const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${game.appid})`;
        const succesIcon = game.hasAchievements ? '🏆' : NO_SUCCES 
        const links = `${succesIcon} | ${steamLink} | ${astatLink} `;

        embed.setThumbnail(gameUrlHeader)
            .setDescription(`**${game.name}**
                            ${links}`)
            .setFooter({ text: `💵 ${infos.money} ${process.env.MONEY} | Page ${currentIndex + 1}/${infos.items.length}`});
        
        let nbItem = 0;
        const nbMax = 5;
        let prix = [], vendeurStr = [];
        for (const item of items) {
            const vendeur = guild.members.cache.get(item.seller.userId);
            // on limite le nb de jeu affichable (car embed à une limite de caracteres)
            if (nbItem < nbMax) {
                prix.push(`${item.montant} ${process.env.MONEY}`);
                vendeurStr.push(vendeur)
                
                nbItem++;
            }
        }

        embed.addFields(
            { name: 'Prix', value: prix.join('\n'), inline: true },
            { name: 'Vendeur', value: vendeurStr.join('\n'), inline: true },
            { name: '\u200B', value: '\u200B', inline: true },                  // 'vide' pour remplir le 3eme field et passé à la ligne
        );

        // si nbmax atteint, on affiche le nb de jeux restants
        if (nbItem > nbMax) {
            embed.addFields(
                { name: 'Nb copies restantes', value: `${items.length - nbItem}`}
            );
        }

    } else if (infos.type == 1) { // TUNNNG
        embed.setDescription(`***🚧 En construction 🚧***`)
    }
    return embed;
}

async function buyGame(client, guildId, author, acheteurDB, vendeur, info) {
    // recup objet DB du vendeur
    let vendeurDB = await client.findUserById(info.items[0].seller.userId);
    
    const game = info._id;
    const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
    logger.info(`Achat jeu ${game.name} par ${acheteurDB.username} pour ${acheteurDB.money} ${process.env.MONEY}`)

    // recup dans la BD pour pouvoir le maj
    let item = await client.findGameItemShop({ _id: info.items[0]._id }); // le 1er est le - cher
    item = item[0];

    // STEP 1 : retire le montant du jeu au "porte-monnaie" de l'acheteur + date dernier achat
    await client.update(acheteurDB, { 
        money: acheteurDB.money - item.montant,
        lastBuy: Date.now()
    });
    // log 'Acheteur perd montant process.env.MONEY a cause vente'
    createLogs(client, guildId, `Argent perdu`, `${author} achète **${game.name}** à **${item.montant} ${process.env.MONEY}**`, `ID vente : ${item._id}`, YELLOW);

    // maj buyer & etat GameItem à 'pending' ou qqchose dans le genre
    await client.update(item, { 
        buyer: acheteurDB,
        state: 'pending'
    });

    // STEP 2 : envoie DM au vendeur 
    logger.info(`Envoi DM au vendeur ${vendeur.user.username}`)
    let MPembed = new EmbedBuilder()
        .setThumbnail(gameUrlHeader)
        .setColor(YELLOW)
        .setTitle('💰 BOUTIQUE - VENTE 💰')
        .setDescription(`${author} vous a acheté ***${game.name}*** !

            Pour recevoir vos ${item.montant} ${process.env.MONEY}, il faut :
            ▶️ **appuyer sur la réaction ${CHECK_MARK} pour commencer**
            
            *En cas de problème, contactez un admin !*`);
            
    // envoi vendeur
    const confBtn = new ButtonBuilder()
                .setCustomId("confBuy")
                .setLabel('Confirmer')
                .setEmoji(CHECK_MARK)
                .setStyle(ButtonStyle.Success)
    // let msgMPEmbed = await vendeur.user.send({ embeds: [MPembed] });
    let msgMPEmbed = await vendeur.user.send({ 
        embeds: [MPembed],
        components: [new ActionRowBuilder( { components: [confBtn] } )] 
    });
    // msgMPEmbed.react(CHECK_MARK);

    // maj state
    await client.update(item, { state: 'pending - key demandée' });
    // log 'Acheteur a acheté la clé JEU à Vendeur pour item.montant MONEY - en attente du vendeur' 
    createLogs(client, guildId, `Achat jeu dans le shop`, `~~1️⃣ ${author} achète **${game.name}** à **${item.montant} ${process.env.MONEY}**~~
                                        2️⃣ ${vendeur} a reçu MP, **clé demandé**, en attente`, `ID vente : ${item._id}`, YELLOW);

    // STEP 3 : attend click confirmation pour pouvoir donner la clé (en cas d'achat simultané, pour pas avoir X msg)
    let filter = m => { return m.user.id === vendeur.user.id }
    const itrConf = await msgMPEmbed.awaitMessageComponent({
        filter,
        componentType: ComponentType.Button,
        // time: 30000
    });
    itrConf.deferUpdate();
    
    MPembed.setDescription(`${author} vous a acheté ***${game.name}*** !

        Pour recevoir vos ${item.montant} ${process.env.MONEY}, il faut :
        ▶️ ~~appuyer sur la réaction ${CHECK_MARK} pour commencer~~
        ▶️ **me répondre en envoyant la clé du jeu**
        
        *En cas de problème, contactez un admin !*`)
    
    await msgMPEmbed.edit({ 
        embeds: [MPembed],
        components: [] 
    });

    // attend une reponse, du même auteur, en DM
    // TODO et si vendeur interdit DM ?
    // filtre sur vendeur
    filter = m => { return m.author.id === vendeur.user.id }
    let response = await msgMPEmbed.channel.awaitMessages({ filter, max: 1 });
    // TODO regex ? AAAAA-BBBBB-CCCCC[-DDDDD-EEEEE] ? autres clés ?
    const daKey = response.first().content;

    // maj state
    await client.update(item, { state: 'pending - key recup' });
    // log 'Vendeur a renseigné la clé JEU - en attente de confirmation de l'acheteur'
    createLogs(client, guildId, `Achat jeu dans le shop`, `~~1️⃣ ${author} achète **${game.name}** à **${item.montant} ${process.env.MONEY}**~~
                                        ~~2️⃣ ${vendeur} a reçu MP, **clé demandé**, en attente~~
                                         3️⃣ ${vendeur} a envoyé la clé ! En attente de confirmation`, `ID vente : ${item._id}`, YELLOW);

    MPembed.setDescription(`${author} vous a acheté ***${game.name}*** !
        
        Pour recevoir vos ${item.montant} ${process.env.MONEY}, il faut :
        ▶️ ~~appuyer sur la réaction ${CHECK_MARK} pour commencer~~
        ▶️ ~~me répondre en envoyant la clé du jeu~~
        ▶️ **attendre la confirmation de l'acheteur**
        ▶️ ???
        ▶️ PROFIT !
        
        *En cas de problème, contactez un admin !*`);
    await vendeur.user.send({ embeds: [MPembed] });

    // STEP 4 : --- ENVOI CLE A ACHETEUR ---
    // DM envoyé à l'acheteur
    let KDOembed = new EmbedBuilder()
        .setThumbnail(gameUrlHeader)
        .setColor(YELLOW)
        .setTitle('💰 BOUTIQUE - VENTE 💰')
        .setDescription(`${vendeur} t'envoie la clé pour le jeu ***${game.name}***.

            Si tu veux avoir accès à la clé, il suffit de **confirmer** en cliquant juste en dessous !
            
            *En cas de problème, contactez un admin !*`);
    
    let msgKDOEmbed = await author.send({ 
        embeds: [KDOembed],
        components: [new ActionRowBuilder( { components: [confBtn] } )] 
    });

    // maj state
    await client.update(item, { state: 'pending - key envoyée' });

    filter = m => { return m.user.id === author.id }
    const itr = await msgKDOEmbed.awaitMessageComponent({
        filter,
        componentType: ComponentType.Button,
        // time: 30000
    })

    KDOembed.setTitle('💰 BOUTIQUE - LA CLÉ 💰')
    KDOembed.setDescription(`${vendeur} t'envoie la clé pour le jeu ***${game.name}*** :

        ⬇️⬇️⬇️
        **${daKey}**
        ⬆️⬆️⬆️

        🙏 Merci d'avoir utilisé CDS Boutique !
        N'hésitez pas de nouveau à claquer votre pognon dans **2 jours** ! 🤑
        
        *En cas de problème, contactez un admin !*`)
    await itr.update({ 
        embeds: [KDOembed],
        components: [] 
    });
    
    // maj state
    await client.update(item, { state: 'done' });
    // maj stat vendeur & acheteur
    vendeurDB.stats.shop.sold++;
    acheteurDB.stats.shop.bought++;
    
    // test si achievement unlock
    const achievementUnlock = await getAchievement(vendeurDB, 'shop');
    if (achievementUnlock) {
        sendMPAchievement(client, guildId, vendeur.user, achievementUnlock);
    }

    await vendeurDB.save();
    await acheteurDB.save();

    // log 'Acheteur a confirmé et à reçu la clé JEU en MP - done'
    createLogs(client, guildId, `Achat jeu dans le shop`, `~~1️⃣ ${author} achète **${game.name}** à **${item.montant} ${process.env.MONEY}**~~
                                        ~~2️⃣ ${vendeur} a reçu MP, **clé demandé**, en attente~~
                                        ~~3️⃣ ${vendeur} a envoyé la clé ! En attente de confirmation~~
                                        4️⃣ ${author} a confirmé la réception ! C'est terminé !`, `ID vente : ${item._id}`, YELLOW);

    // ajoute montant du jeu au porte-monnaie du vendeur
    vendeurDB.money += item.montant;
    await client.update(vendeurDB, { money: vendeurDB.money });
    // log 'Vendeur reçoit montant MONEY grâce vente'
    createLogs(client, guildId, `Argent reçu`, `${vendeur} récupère **${item.montant} ${process.env.MONEY}** suite à la vente de **${game.name}**`, `ID vente : ${item._id}`, YELLOW);

    // msg pour vendeur 
    MPembed.setTitle('💰 BOUTIQUE - VENTE FINIE 💰')
        .setDescription(`${author} a reçu et confirmé l'achat du jeu ***${game.name}*** que vous aviez mis en vente !

            Vous avez bien reçu vos ***${item.montant} ${process.env.MONEY}***, ce qui vous fait un total de ...
            💰 **${vendeurDB.money} ${process.env.MONEY}** !
            
            *En cas de problème, contactez un admin !*`);
    await vendeur.user.send({ embeds: [MPembed] });
}

async function listGames(interaction, options) {
    const client = interaction.client;
    const author = interaction.member;

    let userDB = await client.getUser(author);
    if (!userDB)
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });
    
    const items = await client.findGameItemShopByGame();
    let embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle('💰 BOUTIQUE - LISTE JEUX DISPONIBLES 💰')
        .setDescription(`Liste des jeux disponibles à l'achat.`)
        .setFooter({ text: `💵 ${userDB.money} ${process.env.MONEY}`});

    if (items.length === 0) {
        embed.setDescription(`Liste des jeux disponibles à l'achat.
                                **A U C U N**`);
        return interaction.reply({embeds: [embed]});
    }
    
    let rows = [];
    // row pagination
    const prevBtn = new ButtonBuilder()
        .setCustomId("prev")
        .setLabel('Préc.')
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
    const nextBtn = new ButtonBuilder()
        .setCustomId("next")
        .setLabel('Suiv.')
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(items.length / NB_PAR_PAGES <= 1);
    const rowBuyButton = new ActionRowBuilder()
        .addComponents(
            prevBtn,
            nextBtn
        );
    rows.unshift(rowBuyButton);
    
    /* 1ere page liste */
    embed = createListGame(items, userDB.money);
    let msgListEmbed = await interaction.reply({embeds: [embed], components: rows, fetchReply: true});

    // Collect button interactions
    const collector = msgListEmbed.createMessageComponentCollector({
        filter: ({user}) => user.id === author.id,
        time: 300000 // 5min
    })
    let currentIndex = 0
    collector.on('collect', async itr => {
        // si bouton 'prev' ou 'next' (donc pas 'buy')
        if (itr.customId === 'prev' || itr.customId === 'next') {
            itr.customId === 'prev' ? (currentIndex -= 1) : (currentIndex += 1)

            const max = items.length;
            // disable si 1ere page
            prevBtn.setDisabled(currentIndex == 0)
            // disable next si derniere page
            nextBtn.setDisabled((currentIndex + 1) * NB_PAR_PAGES > max)

            // Respond to interaction by updating message with new embed
            await itr.update({
                embeds: [await createListGame(items, userDB.money, currentIndex)],
                components: [new ActionRowBuilder( { components: [prevBtn, nextBtn] } )]
            })
        }
    })
    
    // apres 5 min, on "ferme" la boutique
    collector.on('end', collected => {
        msgListEmbed.edit({
            embeds: [createListGame(items, userDB.money, currentIndex)],
            components: []
        })
    });
}

function createListGame(items, money, currentIndex = 0) {
    let embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle('💰 BOUTIQUE - LISTE JEUX DISPONIBLES 💰')
        //.setDescription(`Liste des jeux disponibles à l'achat.`)
        .setFooter({ text: `💵 ${money} ${process.env.MONEY} | Page ${currentIndex + 1}/${Math.ceil(items.length / NB_PAR_PAGES)}` })

    // on limite le nb de jeu affichable (car embed à une limite de caracteres)
    // de 0 à 10, puis de 10 à 20, etc
    // on garde l'index courant (page du shop), le nom du jeu et le prix min
    let pages = [], jeux = [], prixMin = [];
    for (let i = 0 + (currentIndex * 10); i < 10 + (currentIndex * 10); i++) {
        const item = items[i];
        if (item) {
            // TODO revoir affichage item (couleur ?)
            pages.push(`**[${i + 1}]**`);
            jeux.push(`*${item._id.name}*`)

            // recupere montant minimum
            prixMin.push(item.items.reduce((min, p) => p.montant < min ? p.montant : min).montant);
        }
    }

    embed.setDescription(`*Pour accéder à la page du shop du jeu concerné : \`/shop jeux <n° page>\`*
                            Jeux disponibles à l'achat :`);
    // pour les afficher et aligner : 1ere colonne : pages, 2eme : prix min 3eme : nom du jeu
    embed.addFields(
        { name: 'Page', value: pages.join('\n'), inline: true },
        { name: 'Prix min', value: prixMin.join('\n'), inline: true },
        { name: 'Jeu', value: jeux.join('\n'), inline: true },
    );

    return embed;
}

// shop sell <montant> <nom du jeu>
async function sell(interaction, options) {
    // recup via autocomplete (loader.js)
    const gameId = options.get('jeu')?.value;
    const montant = options.get('prix')?.value;
    const client = interaction.client;
    const author = interaction.member;

    let userDB = await client.getUser(author);
    if (!userDB)
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

    if (!parseInt(gameId))
        return interaction.reply({ embeds: [createError(`Jeu non trouvé ou donne trop de résultats !`)] });

    if (montant < 0)
        return interaction.reply({ embeds: [createError(`Montant négatif !`)] });
    // TODO divers test : si rang ok (TODO), si montant pas trop bas ni élevé en fonction rang (TODO)

    // "Bot réfléchit.."
    await interaction.deferReply();

    // jeu déjà recherché via autocomplete

    // on recupere le custom id "APPID_GAME"
    let game = await client.findGameByAppid(gameId);

    let item = {
        montant: montant,
        game: game,
        seller: userDB
    }
    let itemDB = await client.createGameItemShop(item);

    let embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle(`💰 BOUTIQUE - VENTE 💰`)
        .setDescription(`${CHECK_MARK} Ordre de vente bien reçu !
        ${game.name} à ${montant} ${process.env.MONEY}`)

    // edit car deferReply
    interaction.editReply({embeds: [embed] });

    // envoie log 'Nouvel vente par @ sur jeu X' (voir avec Tobi)
    createLogs(client, interaction.guildId, `Nouveau jeu dans le shop`, `${author} vient d'ajouter **${game.name}** à **${montant} ${process.env.MONEY}** !`, `ID : ${itemDB._id}`, YELLOW);
}