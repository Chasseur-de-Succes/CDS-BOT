const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require('discord.js');
const { MESSAGES } = require('../../util/constants');
const { PREFIX } = require('../../config.js');
const moment = require('moment');

const { night, yellow, green, dark_red } = require("../../data/colors.json");
const { check_mark, cross_mark } = require('../../data/emojis.json');

module.exports.run = async (client, message, args) => {
    function createRecap(nom, gameUrlHeader, isCreated = false, ...fields) {
        const title = isCreated ? `👑 Ok, l'event *${nom}* a été créé ! Petit récap : ` : `Nouvel évènement ! ${nom} `;
        const color = isCreated ? green : yellow
        return new MessageEmbed()
                    .setColor(color)
                    .setTitle(title)
                    .setThumbnail(gameUrlHeader)
                    .addFields(fields)
    }

    if(!args[0]) {
        return message.channel.send(`Pour afficher l'aide de la commande: \`${PREFIX}${MESSAGES.COMMANDS.CDS.EVENT.name} help\``);
    }
    else if(args[0] == "help") { // HELP
        const embed = new MessageEmbed()
            .setColor(night)
            .setDescription(`Permet de gérer un évènement`)
            .addField("Commandes", `- ${PREFIX}event create <nom> : créer un évènement avec un nom donné sur l'un des groupes où tu es capitaine.`);

        return message.channel.send({embeds: [embed]});
    }
    else if (args[0] == "create") {
        const nom = args.slice(1).join(' ');
        try {
            if (!nom) 
                throw `Il manque le nom de l'event !`;
            
            // recup le ou les groupes où l'user est capitaine
            let crtUser = await client.getUser(message.author);
            let groupes = await client.findGroup({captain: crtUser});
            
            if (groupes?.length === 0) 
                throw `Tu n'es pas capitaine d'un groupe.`;
            else {
                let recap = createRecap(nom);
                let msgRecap = await message.channel.send({embeds: [recap] });
                // TODO timer sur certaines 'attentes'

                /** CHOIX DU GROUPE **/
                // values pour Select Menu
                let items = [];
                for (let i = 0; i < groupes.length; i++) {
                    let crtGrp = groupes[i];
                    if (crtGrp) {
                        items.unshift({
                            label: crtGrp.name,
                            // description: 'Description',
                            value: '' + crtGrp._id
                        });
                    }
                }
                // row contenant le Select menu
                const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('select-groupes-' + message.author)
                        .setPlaceholder('Sélectionner le groupe..')
                        .addOptions(items)
                );

                let embed = new MessageEmbed()
                    .setColor(night)
                    .setTitle(`👑 J'ai trouvé ${groupes.length} groupes où tu es capitaine !`)
                    .setDescription(`Sur lequel veux-tu faire un event ?`);

                let msgEmbed = await message.channel.send({embeds: [embed], components: [row] });

                // attend une interaction bouton de l'auteur de la commande
                let filter = i => {return i.user.id === message.author.id}
                let interaction = await msgEmbed.awaitMessageComponent({
                    filter,
                    componentType: 'SELECT_MENU',
                    // time: 10000
                });

                const grpId = interaction.values[0];
                const groupe = await client.findGroupById(grpId);
                const gameAppid = groupe.game.appid;
                
                const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${gameAppid})`;
                const completionistLink = `[Completionist](https://completionist.me/steam/app/${gameAppid})`;
                const steamGuidesLink = `[Steam Guides](https://steamcommunity.com/app/${gameAppid}/guides/?browsefilter=trend&requiredtags[]=Achievements#scrollTop=0)`;
                const links = `${astatLink} | ${completionistLink} | ${steamGuidesLink}`;

                // TODO icon plutot que l'image ? -> recup via API..
                const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${gameAppid}/header.jpg`;

                console.log(`\x1b[34m[INFO]\x1b[0m .. groupe ${grpId} ${groupe.name} choisi`);
                msgEmbed.delete();

                recap = createRecap(nom, gameUrlHeader, false, { name: 'Groupe', value: `${groupe.name}`, inline: true },
                                                                { name: 'Jeu', value: `${groupe.game.name}\n${links}`, inline: true },
                                                                { name: '\u200B', value: '\u200B', inline: true });
                msgRecap.edit({embeds: [recap] });

                /** CHOIX DATE **/
                embed = new MessageEmbed()
                    .setColor(night)
                    .setTitle(`👑 Ok, va pour le groupe ${groupe.name}. Mais quand ?`)
                    .setDescription(`J'attends une réponse au format jj/mm/aaaa HH:MM stp.`);
                msgEmbed = await message.channel.send({embeds: [embed] });

                // attend une reponse, du même auteur, dans meme channel
                filter = m => {return m.author.id === message.author.id}
                let response = await message.channel.awaitMessages({ filter, max:1 });

                // test si date bon format
                if (!moment(response.first().content, "DD/MM/YY HH:mm", true).isValid())
                    throw `${response.first().content} n'est pas une date valide.`;
                
                // parse string to Moment (date)
                let dateEvent = moment(response.first().content, 'DD/MM/YY HH:mm');
                response.first().delete();
                msgEmbed.delete();
                console.log(`\x1b[34m[INFO]\x1b[0m .. date ${dateEvent} choisi`);

                recap = createRecap(nom, gameUrlHeader, false, { name: 'Groupe', value: `${groupe.name}`, inline: true },
                                                                { name: 'Jeu', value: `${groupe.game.name}\n${links}`, inline: true },
                                                                { name: '\u200B', value: '\u200B', inline: true },
                                                                { name: 'Quand ?', value: `${moment(dateEvent).format("ddd Do MMM HH:mm")}`, inline: true });
                msgRecap.edit({embeds: [recap] });

                /** CHOIX ACHIEVEMENTS **/
                // TODO API Steam ?

                /** DESCRIPTION **/
                embed = new MessageEmbed()
                    .setColor(night)
                    .setTitle(`👑 Ok, une petite description ?`)
                    .setDescription(`J'attends une réponse, elle sera enregistrée en tant que description de l'event.
                                    \n*(but de l'event, succès à chasser, spécificités, etc)*`);
                msgEmbed = await message.channel.send({embeds: [embed] });

                // attend une reponse, du même auteur, dans meme channel
                filter = m => {return m.author.id === message.author.id}
                response = await message.channel.awaitMessages({ filter, max:1 });

                let desc = response.first().content;
                response.first().delete();
                msgEmbed.delete();
                console.log(`\x1b[34m[INFO]\x1b[0m .. description ${desc} choisi`);

                console.log(`EVENT ${nom}, groupe ${groupe.name}, date ${dateEvent}, desc ${desc}`);
                // creation event
                let newEvent = {
                    group: groupe,
                    titre: nom,
                    desc: desc,
                    date: dateEvent
                };
                let eventDB = await client.createEvent(newEvent);

                msgRecap.delete();
                // TODO send msg sur channel specifique ?
                embed = createRecap(nom, gameUrlHeader, true, { name: 'Groupe', value: `${groupe.name}`, inline: true },
                                                                { name: 'Jeu', value: `${groupe.game.name}\n${links}`, inline: true },
                                                                { name: '\u200B', value: '\u200B', inline: true },
                                                                { name: 'Quand ?', value: `${moment(dateEvent).format("ddd Do MMM HH:mm")}`, inline: true },
                                                                { name: 'Desc.', value: `${desc}`, inline: true },
                                                                { name: '\u200B', value: '\u200B', inline: true },);
                msgEmbed = await message.channel.send({embeds: [embed] });
            }
            
        } catch (err) {
            const embedError = new MessageEmbed()
                .setColor(dark_red)
                .setTitle(`${cross_mark} ${err}`);
            console.log(`\x1b[31m[ERROR] \x1b[0mErreur searchgroup ${args[0]} : ${err}`);
            return message.channel.send({ embeds: [embedError] });
        }
    }
}

module.exports.help = MESSAGES.COMMANDS.CDS.EVENT;