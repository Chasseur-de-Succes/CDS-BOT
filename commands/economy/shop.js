const { MESSAGES } = require('../../util/constants');
const { YELLOW, DARK_RED } = require("../../data/colors.json");
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const { MONEY } = require('../../config.js');

module.exports = {
    async run(client, message, args) {
        // TODO gestion admin !
        if(!args[0]) {
            let author = message.author;
            let userDB = await client.getUser(author);
            if (!userDB)
                return sendError(message, `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);

            // choix parmis type item ?
            const embed = new MessageEmbed()
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
            msgEmbed.awaitMessageComponent({
                filter,
                componentType: 'BUTTON',
                time: 30000
            })
            .then(async itr => {
                itr.deferUpdate();
                const btnId = itr.customId;
                let soustitre = '';
                let filtre = {};
                // values pour Select Menu
                let items = [];
                rows = [];

                if (btnId === '0') { // Si JEUX
                    soustitre = 'JEUX';
                    filtre.type = 0;
                    // TODO filtre buyer null
                } else if (btnId === '1') { // Si CUSTOM
                    soustitre = 'TUNNING';
                    filtre.type = 1;
                    // TODO définir fonction à appeler lorsqu'on achete ? similaire à Job
                }
                
                // TODO recup items en fonction filtre
                items.unshift({
                    label: 'Album de Johnny Hallyday',
                    // description: 'Description',
                    value: 'Item 1'
                });
                items.unshift({
                    label: 'Team Fortress 2',
                    // description: 'Description',
                    value: 'Item 2'
                });

                // row contenant le Select menu
                const rowMenu = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('select-items')
                            .setPlaceholder('Sélectionner l item à acheter..')
                            .addOptions(items),
                    );
                    
                    const rowBuyButton = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId("buy")
                            .setLabel('Acheter')
                            .setEmoji('💸')
                            .setStyle('DANGER')
                    );
                rows.unshift(rowBuyButton);
                rows.unshift(rowMenu);

                // on edit, enleve boutons et ajoute le menu + boutons acheter
                embed.setTitle(`💰 BOUTIQUE - ${soustitre} 💰`)
                msgEmbed = await msgEmbed.edit({embeds: [embed], components: rows});

                // attend une interaction bouton de l'auteur de la commande
                let interaction = await msgEmbed.awaitMessageComponent({
                    filter,
                    componentType: 'SELECT_MENU',
                    // time: 10000
                });

                // TODO ne peux pas attendre ? obligé de choisir ET directement acheter
                // TODO faire autrement ?
                await interaction.deferUpdate();
        
                console.log(interaction);
                const itemId = interaction.values[0];
                console.log(`\x1b[34m[INFO]\x1b[0m .. Item ${itemId} choisi`);
            })
            .catch(error => {
                msgEmbed.edit({embeds: [embed], components: []});
            });
        } else {
            if(args[0] == "buy") { // BUY
                message.channel.send('[boutique en construction] buy');
            } else if (args[0] == "sell") {
                message.channel.send('[boutique en construction] sell');

            } else { // argument non valide
                message.channel.send('[boutique en construction] utilisation erronée');
            }
        }
    },

    sendError(message, msgError) {
        let embedError = new MessageEmbed()
            .setColor(DARK_RED)
            .setDescription(`${CROSS_MARK} • ${msgError}`);
        console.log(`\x1b[31m[ERROR] \x1b[0mErreur group : ${msgError}`);
        return message.channel.send({ embeds: [embedError] });
    }
}

module.exports.help = MESSAGES.COMMANDS.ECONOMY.SHOP;