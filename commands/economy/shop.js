const { MESSAGES } = require('../../util/constants');
const { YELLOW, DARK_RED } = require("../../data/colors.json");
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { MONEY } = require('../../config.js');
const { Game, GameItem } = require('../../models');
const mongoose = require("mongoose");

module.exports.run = async (client, message, args) => {
    // TODO gestion admin !
    if (!args[0]) {
        list()
    } else {
        if(args[0] == "buy") { // BUY
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
    }

    async function list() {
        let author = message.author;
        let userDB = await client.getUser(author);
        if (!userDB)
            return sendError(message, `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);

        // choix parmis type item ?
        let embed = new MessageEmbed()
            .setColor(YELLOW)
            .setTitle('💰 BOUTIQUE 💰')
            .setDescription(`Que souhaitez-vous acheter ${message.author} ?`)
            .setFooter(`Vous avez ${0} ${MONEY}`);

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
        let msgEmbed = await message.channel.send({embeds: [embed], components: rows});

        const filter = i => {return i.user.id === message.author.id}
        const itr = await msgEmbed.awaitMessageComponent({
            filter,
            componentType: 'BUTTON',
            time: 30000
        })
        itr.deferUpdate();
        const btnId = itr.customId;
        let filtre = {};
        rows = [];

        if (btnId === '0') { // Si JEUX
            filtre.soustitre = 'JEUX';
            filtre.type = 0;
            // TODO filtre buyer null
            filtre.items = await client.findGameItemShopByGame();
            // [0]._id -> Game
            // [0].items -> GameItemShop
        } else if (btnId === '1') { // Si CUSTOM
            filtre.soustitre = 'TUNNING';
            filtre.type = 1;
            // TODO définir fonction à appeler lorsqu'on achete ? similaire à Job
        }

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
            .setStyle('SECONDARY');
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

        // on edit, enleve boutons et ajoute le menu + boutons acheter
        // TODO msg différent pour jeux / custom ?
        // TODO image
        // TODO footer page X
        // TODO regrouper par jeux
        let shopEmbed = createEmbedShop(filtre);
        msgEmbed = await msgEmbed.edit({embeds: [shopEmbed], components: rows});
        
        // Collect button interactions
        const collector = msgEmbed.createMessageComponentCollector({
            filter: ({user}) => user.id === message.author.id
        })
        
        let currentIndex = 0
        collector.on('collect', async interaction => {
            // Increase/decrease index
            console.log(interaction.customId);
            if (interaction.customId !== 'buy') {
                interaction.customId === 'prev' ? (currentIndex -= 1) : (currentIndex += 1)
                const max = filtre.items.length;
                // disable si 1ere page
                prevBtn.setDisabled(currentIndex == 0)
                // TODO disable next si derniere page
                nextBtn.setDisabled(currentIndex + 1 == max)
                // TODO disable buy si pas assez argent ?
    
                // Respond to interaction by updating message with new embed
                await interaction.update({
                    embeds: [await createEmbedShop(filtre, interaction.customId, currentIndex)],
                    components: [new MessageActionRow( { components: [prevBtn, nextBtn, buyBtn] } )]
                })
            } else {
                // TODO acheter
            }
        })
    }

    function createEmbedShop(filtre, index, currentIndex = 0) {
        let embed = new MessageEmbed()
            .setTitle(`💰 BOUTIQUE - ${filtre.soustitre} 💰`)
            // JEUX
            if (filtre.type == 0) {
                const game = filtre.items[currentIndex]._id;
                const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
                const items = filtre.items[currentIndex].items
                // TODO recup info jeu, lien astats/steam/etc
            embed.setThumbnail(gameUrlHeader)
                .setDescription(`**${game.name}**`)
                .setFooter(`Vous avez ${0} ${MONEY} | Page ${currentIndex + 1}/${filtre.items.length}`);
            
            for (const item of items) {
                const vendeur = message.guild.members.cache.get(item.seller.userId);
                embed.addFields(
                    { name: 'Prix', value: `${item.montant} ${MONEY}`, inline: true },
                    { name: 'Vendeur', value: `${vendeur}`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true },                  // 'vide' pour remplir le 3eme field et passé à la ligne
                );
            }
        } else if (filtre.type == 1) { // TUNNNG
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