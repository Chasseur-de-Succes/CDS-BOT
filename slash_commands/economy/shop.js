const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const { MESSAGES } = require("../../util/constants");
const { createError, sendLogs } = require("../../util/envoiMsg");
const { YELLOW,  } = require("../../data/colors.json");
const { CHECK_MARK, NO_SUCCES } = require('../../data/emojis.json');
const { MONEY } = require('../../config.js');
const moment = require('moment');
const mongoose = require('mongoose');

const NB_PAR_PAGES = 10;

module.exports.run = async (interaction) => {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
        listGames(interaction, interaction.options);
    } else if (subcommand === 'jeux') {
        list(interaction, interaction.options, true);
    } else if (subcommand === 'custom') {
        list(interaction, interaction.options, false);
        // TODO EN CONSTRUCTION
    } else if (subcommand === 'sell') {
        sell(interaction, interaction.options)
    }
}

const list = async (interaction, options, showGame = false) => {
    let nbPage = options.get('page') ? options.get('page').value - 1 : 0;
    const client = interaction.client;
    const guild = interaction.guild;
    let author = interaction.member;

    let userDB = await client.getUser(author);
    if (!userDB)
        return interaction.reply({ embeds: [createError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`/register\``)] });

    let infos = {};
    infos.money = userDB.money;
    let rows = [];
    
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
    }
    
    const max = infos.items?.length ?? 0;
    // si 0 item dispo
    if (showGame && max === 0) 
        return interaction.reply({ embeds: [createError(`Désolé, aucun item n'est actuellement en vente !`)] });
        
    // teste si index nbPages existe
    if (nbPage < 0 || nbPage >= max)
        return interaction.reply({ embeds: [createError(`Oh là, il n'y a pas autant de pages que ça !`)] });
    let currentIndex = nbPage;

    // row pagination
    const prevBtn = new MessageButton()
        .setCustomId("prev")
        .setLabel('Préc.')
        .setEmoji('⬅️')
        .setStyle('SECONDARY')
        .setDisabled(nbPage == 0);
    const nextBtn = new MessageButton()
        .setCustomId("next")
        .setLabel('Suiv.')
        .setEmoji('➡️')
        .setStyle('SECONDARY')
        .setDisabled(nbPage + 1 == max);
    const buyBtn = new MessageButton()
        .setCustomId("buy")
        .setLabel('Acheter')
        .setEmoji('💸')
        .setStyle('DANGER')
        // TODO a modifier une fois boutique custom faite
        .setDisabled(infos.type == 1 || (userDB.money < infos.items[currentIndex].items[0].montant))
    const rowBuyButton = new MessageActionRow()
        .addComponents(
            prevBtn,
            nextBtn,
            buyBtn
        );
    rows.unshift(rowBuyButton);

    // on envoie créer et envoie le message du shop
    // TODO msg différent pour jeux / custom ?
    let shopEmbed = createShop(guild, infos, nbPage);
    let msgShopEmbed = await interaction.reply({embeds: [shopEmbed], components: rows, fetchReply: true});
    
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
                components: [new MessageActionRow( { components: [prevBtn, nextBtn, buyBtn] } )]
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
                buyGame(client, author, userDB, vendeur, items);

                // message recap
                let recapEmbed = new MessageEmbed()
                    .setColor(YELLOW)
                    .setTitle(`💰 BOUTIQUE - ${infos.soustitre} - RECAP' 💰`)
                    .setDescription(`${CHECK_MARK} ${author}, vous venez d'acheter **${items._id.name}** à **${items.items[0].montant}** ${MONEY}
                        ${vendeur} a reçu un **DM**, dès qu'il m'envoie la clé, je te l'envoie !

                        *En cas de problème, n'hésitez pas à contacter un **admin***.`)
                    .setFooter({text: `💵 ${userDB.money - items.items[0].montant} ${MONEY}`});
                
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

function createShop(guild, infos, currentIndex = 0) {
    let embed = new MessageEmbed()
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
            .setFooter({ text: `💵 ${infos.money} ${MONEY} | Page ${currentIndex + 1}/${infos.items.length}`});
        
        let nbItem = 0;
        const nbMax = 5;
        let prix = [], vendeurStr = [];
        for (const item of items) {
            const vendeur = guild.members.cache.get(item.seller.userId);
            // on limite le nb de jeu affichable (car embed à une limite de caracteres)
            if (nbItem < nbMax) {
                prix.push(`${item.montant} ${MONEY}`);
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

async function buyGame(client, author, acheteurDB, vendeur, info) {
    // recup objet DB du vendeur
    let vendeurDB = await client.findUserById(info.items[0].seller.userId);
    
    const game = info._id;
    const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
    logger.info(`Achat jeu ${game.name} par ${acheteurDB.username} pour ${acheteurDB.money} ${MONEY}`)

    // recup dans la BD pour pouvoir le maj
    let item = await client.findGameItemShop({ _id: info.items[0]._id }); // le 1er est le - cher
    item = item[0];

    // STEP 1 : retire le montant du jeu au "porte-monnaie" de l'acheteur + date dernier achat
    await client.update(acheteurDB, { 
        money: acheteurDB.money - item.montant,
        lastBuy: Date.now()
    });
    // log 'Acheteur perd montant MONEY a cause vente'
    sendLogs(client, `Argent perdu`, `${author} achète **${game.name}** à **${item.montant} ${MONEY}**`, `ID vente : ${item._id}`, YELLOW);

    // maj buyer & etat GameItem à 'pending' ou qqchose dans le genre
    await client.update(item, { 
        buyer: acheteurDB,
        state: 'pending'
    });

    // STEP 2 : envoie DM au vendeur 
    logger.info(`Envoi DM au vendeur ${vendeur.user.username}`)
    let MPembed = new MessageEmbed()
        .setThumbnail(gameUrlHeader)
        .setColor(YELLOW)
        .setTitle('💰 BOUTIQUE - VENTE 💰')
        .setDescription(`${author} vous a acheté ***${game.name}*** !

            Pour recevoir vos ${item.montant} ${MONEY}, il faut :
            ▶️ **appuyer sur la réaction ${CHECK_MARK} pour commencer**
            
            *En cas de problème, contactez un admin !*`);
            
    // envoi vendeur
    const confBtn = new MessageButton()
                .setCustomId("confBuy")
                .setLabel('Confirmer')
                .setEmoji(CHECK_MARK)
                .setStyle('SUCCESS')
    // let msgMPEmbed = await vendeur.user.send({ embeds: [MPembed] });
    let msgMPEmbed = await vendeur.user.send({ 
        embeds: [MPembed],
        components: [new MessageActionRow( { components: [confBtn] } )] 
    });
    // msgMPEmbed.react(CHECK_MARK);

    // maj state
    await client.update(item, { state: 'pending - key demandée' });
    // log 'Acheteur a acheté la clé JEU à Vendeur pour item.montant MONEY - en attente du vendeur' 
    sendLogs(client, `Achat jeu dans le shop`, `~~1️⃣ ${author} achète **${game.name}** à **${item.montant} ${MONEY}**~~
                                        2️⃣ ${vendeur} a reçu MP, **clé demandé**, en attente`, `ID vente : ${item._id}`, YELLOW);

    // STEP 3 : attend click confirmation pour pouvoir donner la clé (en cas d'achat simultané, pour pas avoir X msg)
    let filter = m => { return m.user.id === vendeur.user.id }
    const itrConf = await msgMPEmbed.awaitMessageComponent({
        filter,
        componentType: 'BUTTON',
        // time: 30000
    });
    itrConf.deferUpdate();
    
    MPembed.setDescription(`${author} vous a acheté ***${game.name}*** !

        Pour recevoir vos ${item.montant} ${MONEY}, il faut :
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
    sendLogs(client, `Achat jeu dans le shop`, `~~1️⃣ ${author} achète **${game.name}** à **${item.montant} ${MONEY}**~~
                                        ~~2️⃣ ${vendeur} a reçu MP, **clé demandé**, en attente~~
                                         3️⃣ ${vendeur} a envoyé la clé ! En attente de confirmation`, `ID vente : ${item._id}`, YELLOW);

    MPembed.setDescription(`${author} vous a acheté ***${game.name}*** !
        
        Pour recevoir vos ${item.montant} ${MONEY}, il faut :
        ▶️ ~~appuyer sur la réaction ${CHECK_MARK} pour commencer~~
        ▶️ ~~me répondre en envoyant la clé du jeu~~
        ▶️ **attendre la confirmation de l'acheteur**
        ▶️ ???
        ▶️ PROFIT !
        
        *En cas de problème, contactez un admin !*`);
    await vendeur.user.send({ embeds: [MPembed] });

    // STEP 4 : --- ENVOI CLE A ACHETEUR ---
    // DM envoyé à l'acheteur
    let KDOembed = new MessageEmbed()
        .setThumbnail(gameUrlHeader)
        .setColor(YELLOW)
        .setTitle('💰 BOUTIQUE - VENTE 💰')
        .setDescription(`${vendeur} t'envoie la clé pour le jeu ***${game.name}***.

            Si tu veux avoir accès à la clé, il suffit de **confirmer** en cliquant juste en dessous !
            
            *En cas de problème, contactez un admin !*`);
    
    let msgKDOEmbed = await author.send({ 
        embeds: [KDOembed],
        components: [new MessageActionRow( { components: [confBtn] } )] 
    });

    // maj state
    await client.update(item, { state: 'pending - key envoyée' });

    filter = m => { return m.user.id === author.id }
    const itr = await msgKDOEmbed.awaitMessageComponent({
        filter,
        componentType: 'BUTTON',
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
    // log 'Acheteur a confirmé et à reçu la clé JEU en MP - done'
    sendLogs(client, `Achat jeu dans le shop`, `~~1️⃣ ${author} achète **${game.name}** à **${item.montant} ${MONEY}**~~
                                        ~~2️⃣ ${vendeur} a reçu MP, **clé demandé**, en attente~~
                                        ~~3️⃣ ${vendeur} a envoyé la clé ! En attente de confirmation~~
                                        4️⃣ ${author} a confirmé la réception ! C'est terminé !`, `ID vente : ${item._id}`, YELLOW);

    // ajoute montant du jeu au porte-monnaie du vendeur
    vendeurDB.money += item.montant;
    await client.update(vendeurDB, { money: vendeurDB.money });
    // log 'Vendeur reçoit montant MONEY grâce vente'
    sendLogs(client, `Argent reçu`, `${vendeur} récupère **${item.montant} ${MONEY}** suite à la vente de **${game.name}**`, `ID vente : ${item._id}`, YELLOW);

    // msg pour vendeur 
    MPembed.setTitle('💰 BOUTIQUE - VENTE FINIE 💰')
        .setDescription(`${author} a reçu et confirmé l'achat du jeu ***${game.name}*** que vous aviez mis en vente !

            Vous avez bien reçu vos ***${item.montant} ${MONEY}***, ce qui vous fait un total de ...
            💰 **${vendeurDB.money} ${MONEY}** !
            
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
    let embed = new MessageEmbed()
        .setColor(YELLOW)
        .setTitle('💰 BOUTIQUE - LISTE JEUX DISPONIBLES 💰')
        .setDescription(`Liste des jeux disponibles à l'achat.`)
        .setFooter({ text: `💵 ${userDB.money} ${MONEY}`});

    if (items.length === 0) {
        embed.setDescription(`Liste des jeux disponibles à l'achat.
                                **A U C U N**`);
        return interaction.reply({embeds: [embed]});
    }
    
    let rows = [];
    // row pagination
    const prevBtn = new MessageButton()
        .setCustomId("prev")
        .setLabel('Préc.')
        .setEmoji('⬅️')
        .setStyle('SECONDARY')
        .setDisabled(true);
    const nextBtn = new MessageButton()
        .setCustomId("next")
        .setLabel('Suiv.')
        .setEmoji('➡️')
        .setStyle('SECONDARY')
        .setDisabled(items.length / NB_PAR_PAGES <= 1);
    const rowBuyButton = new MessageActionRow()
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
                components: [new MessageActionRow( { components: [prevBtn, nextBtn] } )]
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
    let embed = new MessageEmbed()
        .setColor(YELLOW)
        .setTitle('💰 BOUTIQUE - LISTE JEUX DISPONIBLES 💰')
        //.setDescription(`Liste des jeux disponibles à l'achat.`)
        .setFooter({ text: `💵 ${money} ${MONEY} | Page ${currentIndex + 1}/${Math.ceil(items.length / NB_PAR_PAGES)}` })

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
    const gameName = options.get('jeu')?.value;
    const montant = options.get('prix')?.value;
    const client = interaction.client;
    const author = interaction.member;

    let userDB = await client.getUser(author);
    if (!userDB)
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

    if (montant < 0)
        return interaction.reply({ embeds: [createError(`Montant négatif !`)] });
    // TODO divers test : si rang ok (TODO), si montant pas trop bas ni élevé en fonction rang (TODO)

    // - recherche du jeu
    // création de la regex sur le nom du jeu        
    logger.info(`Recherche jeu Steam par nom ${gameName}`)
    let regGame = new RegExp(gameName, "i");

    // recherche..
    await interaction.deferReply();

    // récupère les jeux en base en fonction d'un nom, avec succès et Multi et/ou Coop
    let games = await client.findGames({
        name: regGame
    });

    logger.info(`.. ${games.length} jeu(x) trouvé(s)`);
    if (!games) return interaction.editReply({ embeds: [createError(`Erreur lors de la recherche du jeu`)] });
    if (games.length === 0) return interaction.editReply({ embeds: [createError(`Pas de résultat trouvé pour **${gameName}** !`)] });

    // values pour Select Menu
    let items = [];
    for (let i = 0; i < games.length; i++) {
        let crtGame = games[i];
        if (crtGame) {
            items.unshift({
                label: crtGame.name,
                // description: 'Description',
                value: '' + crtGame.appid
            });
        }
    }
    // SELECT n'accepte que 25 max
    if (items.length > 25) return interaction.editReply({ embeds: [createError(`Trop de jeux trouvés ! Essaie d'être plus précis stp.`)] });
    
    // row contenant le Select menu
    const row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('select-games-' + author)
                .setPlaceholder('Sélectionner le jeu..')
                .addOptions(items)
        );

    let embed = new MessageEmbed()
        .setColor(YELLOW)
        .setTitle(`💰 BOUTIQUE - VENTE - J'ai trouvé ${games.length} jeux ! 💰`)
        .setDescription(`Quel jeu veux-tu vendre ?`);

    let msgEmbed = await interaction.editReply({embeds: [embed], components: [row] });

    // attend une interaction bouton de l'auteur de la commande
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
        
    const gameId = itr.values[0];
    logger.info(`.. Steam app ${gameId} choisi`);
    // on recupere le custom id "APPID_GAME"
    let game = await client.findGameByAppid(gameId);

    let item = {
        montant: montant,
        game: game,
        seller: userDB
    }
    let itemDB = await client.createGameItemShop(item);

    embed.setTitle(`💰 BOUTIQUE - VENTE 💰`)
        .setDescription(`${CHECK_MARK} Ordre de vente bien reçu !
        ${game.name} à ${montant} ${MONEY}`)
    msgEmbed.edit({ embeds: [embed], components: [] })

    // envoie log 'Nouvel vente par @ sur jeu X' (voir avec Tobi)
    sendLogs(client, `Nouveau jeu dans le shop`, `${author} vient d'ajouter **${game.name}** à **${montant} ${MONEY}** !`, `ID : ${itemDB._id}`, YELLOW);
}

module.exports.help = MESSAGES.COMMANDS.ECONOMY.SHOP;