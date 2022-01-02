const { MESSAGES } = require('../../util/constants');
const { YELLOW, DARK_RED } = require("../../data/colors.json");
const { CROSS_MARK } = require('../../data/emojis.json');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { MONEY } = require('../../config.js');
const { Game, GameItem } = require('../../models');
const mongoose = require("mongoose");

module.exports.run = async (client, message, args) => {
    // TODO log apres merge pour utiliser ce que Rick a fait
    // TODO ajouter dans Game, un rang défini par admin ?
    // TODO gestion admin !

    // regex pour test si arg0 est un entier
    let isArgNum = /^\d+$/.test(args[0]);
    if (!args[0]) { // 0 args : shop
        list()
    } else if(isArgNum) { // si 1er arg est un entier
        // parse puis -1 car index commence à 0, et page commence à 1
        list(Number.parseInt(args[0]) - 1, true)
    } else if(args[0] == "list") { // liste "simplifiée" qui affiche que les jeux dispo ?
        listGames()
    } else if(args[0] == "buy") { // BUY (?)
        message.channel.send('[boutique en construction] buy');
    } else if (args[0] == "sell") {
        message.channel.send('[boutique en construction] sell');

        // test save
        /* let item = {
            name: 'mon 1er test',
            montant: 420,
            game: await Game.findOne({ appid: 221910 }),
            seller: await client.getUser(message.author)
        }
        
        const merged = Object.assign({_id: mongoose.Types.ObjectId()}, item);
        const createItem = await new GameItem(merged);
        const usr = await createItem.save();
        console.log(`\x1b[34m[INFO]\x1b[35m[DB]\x1b[0m Nouvel item : ${usr}`); */

    } else { // argument non valide
        message.channel.send('[boutique en construction] utilisation erronée');
    }

    const NB_PAR_PAGES = 10;

    async function listGames() {
        let author = message.author;
        let userDB = await client.getUser(author);
        if (!userDB)
            return sendError(message, `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);
        
        const items = await client.findGameItemShopByGame();
        let embed = new MessageEmbed()
            .setColor(YELLOW)
            .setTitle('💰 BOUTIQUE - LISTE JEUX DISPONIBLES 💰')
            .setDescription(`Liste des jeux disponibles à l'achat.`)
            .setFooter(`Vous avez ${0} ${MONEY}`);
        
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
        let msgListEmbed = await message.channel.send({embeds: [embed], components: rows});

        // Collect button interactions
        const collector = msgListEmbed.createMessageComponentCollector({
            filter: ({user}) => user.id === author.id
        })
        let currentIndex = 0
        collector.on('collect', async interaction => {
            // si bouton 'prev' ou 'next' (donc pas 'buy')
            if (interaction.customId === 'prev' || interaction.customId === 'next') {
                interaction.customId === 'prev' ? (currentIndex -= 1) : (currentIndex += 1)
                // TODO
                const max = items.length;
                // disable si 1ere page
                prevBtn.setDisabled(currentIndex == 0)
                // disable next si derniere page
                nextBtn.setDisabled((currentIndex + 1) * NB_PAR_PAGES > max)
                // TODO disable buy si pas assez argent ?
    
                // Respond to interaction by updating message with new embed
                await interaction.update({
                    embeds: [await createListGame(items, userDB.money, currentIndex)],
                    components: [new MessageActionRow( { components: [prevBtn, nextBtn] } )]
                })
            }
        })
    }

    async function list(nbPage = 0, showGame = false) {
        let author = message.author;
        let userDB = await client.getUser(author);
        if (!userDB)
            return sendError(message, `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);

        // choix parmis type item 
        let embed = new MessageEmbed()
            .setColor(YELLOW)
            .setTitle('💰 BOUTIQUE 💰')
            .setDescription(`Que souhaitez-vous acheter ${message.author} ?`)
            .setFooter(`Vous avez ${userDB.money} ${MONEY}`);

        let rows = [];
        let row = new MessageActionRow();
        row.addComponents(
            new MessageButton()
                .setCustomId("0")
                .setLabel('Jeux')
                .setEmoji('🎮')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId("1")
                .setLabel('Personnalisation')
                .setEmoji('🖌️')
                .setStyle('SECONDARY')
        );
        rows.unshift(row);
        
        /* 
        BOUTIQUE
        [Jeux (ID 0)] [Personnalisation (ID 1)] [Autres (ID 2)]
        */
        // si on veut afficher direct les jeux, pas besoin d'evnoyer le 1er message
        let btnId = '';
        if (!showGame) {
            let msgEmbed = await message.channel.send({embeds: [embed], components: rows});
            
            const filter = i => {return i.user.id === message.author.id}
            const itr = await msgEmbed.awaitMessageComponent({
                filter,
                componentType: 'BUTTON',
                time: 30000
            })
            itr.deferUpdate();
            btnId = itr.customId;

            msgEmbed.delete();
        } else {
            btnId = '0';
        }
        let infos = {};
        infos.money = userDB.money;
        rows = [];
        
        if (btnId === '0') { // Si JEUX
            infos.soustitre = 'JEUX';
            infos.type = 0;
            // recupere array d'info sur jeux à vendre
            // [0]._id -> Game
            // [0].items -> GameItemShop
            infos.items = await client.findGameItemShopByGame();
        } else if (btnId === '1') { // Si CUSTOM
            infos.soustitre = 'TUNNING';
            infos.type = 1;
            // TODO définir fonction à appeler lorsqu'on achete ? similaire à Job
        }
        
        const max = infos.items.length;
        // TODO tester si index nbPages existe
        if (nbPage < 0 || nbPage > max)
            return sendError(message, `Oh la, il n'y a pas autant de pages que ça !`);

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
            .setDisabled(nbPage == infos.items.length);
        const buyBtn = new MessageButton()
            .setCustomId("buy")
            .setLabel('Acheter')
            .setEmoji('💸')
            .setStyle('DANGER')
        const rowBuyButton = new MessageActionRow()
            .addComponents(
                prevBtn,
                nextBtn,
                buyBtn
            );
        rows.unshift(rowBuyButton);

        // on envoie créer et envoie le message du shop
        // TODO msg différent pour jeux / custom ?
        let shopEmbed = createEmbedShop(infos, nbPage);
        let msgShopEmbed = await message.channel.send({embeds: [shopEmbed], components: rows});
        
        // Collect button interactions
        const collector = msgShopEmbed.createMessageComponentCollector({
            filter: ({user}) => user.id === message.author.id
        })
        
        let currentIndex = nbPage;
        collector.on('collect', async interaction => {
            // si bouton 'prev' ou 'next' (donc pas 'buy')
            if (interaction.customId !== 'buy') {
                interaction.customId === 'prev' ? (currentIndex -= 1) : (currentIndex += 1)
                // disable si 1ere page
                prevBtn.setDisabled(currentIndex == 0)
                // disable next si derniere page
                nextBtn.setDisabled(currentIndex + 1 == max)
                // TODO disable buy si pas assez argent ?
    
                // Respond to interaction by updating message with new embed
                await interaction.update({
                    embeds: [await createEmbedShop(infos, currentIndex)],
                    components: [new MessageActionRow( { components: [prevBtn, nextBtn, buyBtn] } )]
                })
            } else {
                // TODO acheter
            }
        })
    }

    function createListGame(items, money, currentIndex = 0) {
        // TODO dire que commande XX permet d'ouvrir le shop sur tel jeu ?
        let embed = new MessageEmbed()
            .setColor(YELLOW)
            .setTitle('💰 BOUTIQUE - LISTE JEUX DISPONIBLES 💰')
            //.setDescription(`Liste des jeux disponibles à l'achat.`)
            .setFooter(`Vous avez ${money} ${MONEY} | Page ${currentIndex + 1}/${Math.ceil(items.length / NB_PAR_PAGES)}`)

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
                // prixMin.push(item.items.reduce((min, p) => p.montant < min ? p.montant : min).montant + ` ${MONEY}`);
                prixMin.push(item.items.reduce((min, p) => p.montant < min ? p.montant : min).montant);
            }
        }

        // TODO 3 ou 2eme colonne, lien ? nb copie ?
        embed.setDescription(`Jeux disponibles à l'achat :`);
        // pour les afficher et aligner : 1ere colonne : pages, 2eme : prix min 3eme : nom du jeu
        embed.addFields(
            { name: 'Page', value: pages.join('\n'), inline: true },
            { name: 'Prix min', value: prixMin.join('\n'), inline: true },
            { name: 'Jeu', value: jeux.join('\n'), inline: true },
            //{ name: '\u200B', value: '\u200B', inline: true },                  // 'vide' pour remplir le 3eme field et passé à la ligne
        );

        return embed;
    }

    function createEmbedShop(infos, currentIndex = 0) {
        let embed = new MessageEmbed()
            .setColor(YELLOW)
            .setTitle(`💰 BOUTIQUE - ${infos.soustitre} 💰`)
        // JEUX
        if (infos.type == 0) {
            const game = infos.items[currentIndex]._id;
            const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
            const items = infos.items[currentIndex].items
            // TODO recup info jeu, lien astats/steam/etc

            embed.setThumbnail(gameUrlHeader)
                .setDescription(`**${game.name}**`)
                .setFooter(`Vous avez ${infos.money} ${MONEY} | Page ${currentIndex + 1}/${infos.items.length}`);
            
            let nbItem = 0;
            const nbMax = 3;
            for (const item of items) {
                const vendeur = message.guild.members.cache.get(item.seller.userId);
                // on limite le nb de jeu affichable (car embed à une limite de caracteres)
                if (nbItem < nbMax) {
                    embed.addFields(
                        { name: 'Prix', value: `${item.montant} ${MONEY}`, inline: true },
                        { name: 'Vendeur', value: `${vendeur}`, inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },                  // 'vide' pour remplir le 3eme field et passé à la ligne
                    );
                    nbItem++;
                }
            }
            // si nbmax atteint, on affiche le nb de jeux restants
            if (nbItem == nbMax) {
                embed.addFields(
                    { name: 'Nb copies restantes', value: `${items.length - nbItem}`}
                );
            }

        } else if (infos.type == 1) { // TUNNNG
            embed.setDescription(`***🚧 En construction 🚧***`)
        }
        return embed;
    }

    function sendError(message, msgError) {
        let embedError = new MessageEmbed()
            .setColor(DARK_RED)
            .setDescription(`${CROSS_MARK} • ${msgError}`);
        console.log(`\x1b[31m[ERROR] \x1b[0mErreur group : ${msgError}`);
        return message.channel.send({ embeds: [embedError] });
    }
}

module.exports.help = MESSAGES.COMMANDS.ECONOMY.SHOP;