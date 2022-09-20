const { MESSAGES, SALON } = require("../../util/constants");
const { createError, createLogs, sendLogs } = require("../../util/envoiMsg");
const { MessageActionRow, MessageSelectMenu, MessageEmbed, Permissions, Message, CategoryChannel } = require("discord.js");
const { NIGHT } = require("../../data/colors.json");
const { CHECK_MARK, WARNING } = require('../../data/emojis.json');
const { editMsgHubGroup, endGroup, createGroup, dissolveGroup, leaveGroup, deleteRappelJob } = require("../../util/msg/group");
const { createRappelJob } = require("../../util/batch/batch");
const { GuildConfig, Game } = require('../../models');
const moment = require('moment');
const { MONEY } = require("../../config");

module.exports.run = async (interaction) => {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
        create(interaction, interaction.options)
    } else if (subcommand === 'session') {
        schedule(interaction, interaction.options)
    } else if (subcommand === 'dissolve') {
        dissolve(interaction, interaction.options)
    } else if (subcommand === 'transfert') {
        transfert(interaction, interaction.options)
    } else if (subcommand === 'end') {
        end(interaction, interaction.options)
    } else if (subcommand === 'kick') {
        kick(interaction, interaction.options)
    }
}

const create = async (interaction, options) => {
    const nameGrp = options.get('nom')?.value;
    const nbMaxMember = options.get('max')?.value; // INTEGER
    const gameName = options.get('jeu')?.value;
    const description = options.get('description')?.value;
    const client = interaction.client;
    const captain = interaction.member;
    const guildId = interaction.guildId;
    
    // test si captain est register
    const captainDB = await client.getUser(captain);
    if (!captainDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${captain.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

    // la regex test la taille mais pour l'utilisateur il vaut mieux lui dire d'où vient le pb
    if (nameGrp.length < 3) 
        return interaction.reply({ embeds: [createError(`Le nombre **minimum** de caractères pour le nom d'un groupe est de **3**`)] });
    // nb max member > 2
    if (nbMaxMember < 2)
        return interaction.reply({ embeds: [createError(`Le nombre **minimum** de joueurs dans un groupe est de **2**`)] });

    // si nom groupe existe
    let grp = await client.findGroupByName(nameGrp);
    if (grp) 
        return interaction.reply({ embeds: [createError(`Le nom du groupe existe déjà. Veuillez en choisir un autre.`)] });
    
    // création de la regex sur le nom du jeu
    logger.info(`Recherche jeu Steam par nom : ${gameName}..`);
    let regGame = new RegExp(gameName, "i");

    // "recherche.."
    await interaction.deferReply();

    // récupère les jeux en base en fonction d'un nom, avec succès et Multi et/ou Coop
    let games = await Game.aggregate([{
        '$match': { 'name': regGame }
    },
    /*{
        '$match': { 'type': 'game' }
    }, */
    {
        '$limit': 25
    }])

    logger.info(`.. ${games.length} jeu(x) trouvé(s)`);
    if (!games) return await interaction.editReply({ embeds: [createError(`Erreur lors de la recherche du jeu`)] });
    if (games.length === 0) return await interaction.editReply({ embeds: [createError(`Pas de résultat trouvé pour **${gameName}** !`)] });

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
    // if (items.length > 25) return await interaction.editReply({ embeds: [createError(`Trop de jeux trouvés ! Essaie d'être plus précis stp.`)] });

    // row contenant le Select menu
    const row = new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('select-games-' + captain)
            .setPlaceholder('Sélectionner le jeu..')
            .addOptions(items)
    );

    let embed = new MessageEmbed()
        .setColor(NIGHT)
        .setTitle(`J'ai trouvé ${games.length} jeux, avec succès, en multi et/ou coop !`)
        .setDescription(`Lequel est celui que tu cherchais ?`);
    
    let msgEmbed = await interaction.editReply({embeds: [embed], components: [row] });

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
        await interaction.editReply({ components: [] })
        return;
    }
    // on enleve le select
    await interaction.editReply({ components: [] })

    const gameId = itrSelect.values[0];
    logger.info(`.. Steam app ${gameId} choisi`);
    // on recupere le custom id "APPID_GAME"
    const game = await client.findGameByAppid(gameId);

    const idDiscussionGroupe = await client.getGuildChannel(guildId, SALON.CAT_DISCUSSION_GROUPE);
    let cat = await client.channels.cache.get(idDiscussionGroupe);
    if (!cat) {
        logger.error("Catégorie des discussions de groupe n'existe pas ! Création en cours...");
        const nameCat = "Discussions groupes";
        cat = await interaction.guild.channels.create(nameCat, {
            type: "GUILD_CATEGORY"
        });
        await GuildConfig.updateOne(
            { guildId: guildId },
            { $set: { ["channels." + SALON.CAT_DISCUSSION_GROUPE] : cat.id } }
        );
        logger.info(`Catégorie "${nameCat}" créé avec succès`);
    }

    // création channel de discussion
    const channel = await interaction.guild.channels.create(nameGrp, {
            type: "GUILD_TEXt",
            parent: cat,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: captain.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
                },
            ],
    });

    // creation groupe
    let newGrp = {
        name: nameGrp,
        desc: description,
        nbMax: nbMaxMember,
        captain: captainDB._id,
        members: [captainDB._id],
        game: game,
        channelId: channel.id
    };
    createGroup(client, interaction.guildId, newGrp);

    const newMsgEmbed = new MessageEmbed()
        .setTitle(`${CHECK_MARK} Le groupe **${nameGrp}** a bien été créé !`)
        .addFields(
            { name: 'Jeu', value: `${game.name}`, inline: true },
            { name: 'Nb max joueurs', value: `${nbMaxMember}`, inline: true },
            { name: 'Capitaine', value: `${captain}`, inline: true },
        );

    await interaction.editReply({ embeds: [newMsgEmbed] });
}

const schedule = async (interaction, options) => {
    const nameGrp = options.get('nom')?.value;
    const dateVoulue = options.get('jour')?.value; // INTEGER
    const heureVoulue = options.get('heure')?.value;
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES);

    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

    // recup le groupe
    let grp = await client.findGroupByName(nameGrp);
    if (!grp) 
        return interaction.reply({ embeds: [createError(`Le groupe ${nameGrp} n'existe pas !`)] });
        
    // si l'author n'est pas capitaine ou admin
    if (!isAdmin && !grp.captain._id.equals(authorDB._id))
        return interaction.reply({ embeds: [createError(`Tu n'es pas capitaine du groupe ${nameGrp} !`)] });
    
    // test si date bon format
    const allowedDateFormat = ['DD/MM/YY HH:mm', 'DD/MM/YYYY HH:mm'];
    if (!moment(dateVoulue + ' ' + heureVoulue, allowedDateFormat, true).isValid())
        return interaction.reply({ embeds: [createError(`${dateVoulue + ' ' + heureVoulue} n'est pas une date valide.\nFormat accepté : ***jj/mm/aa HH:MM***`)] });

    // parse string to Moment (date)
    let dateEvent = moment(dateVoulue + ' ' + heureVoulue, allowedDateFormat);
    await interaction.deferReply();

    // si la date existe déjà, la supprimer
    const indexDateEvent = grp.dateEvent.findIndex(d => d.getTime() === dateEvent.valueOf());
    let titreReponse = `${CHECK_MARK} `;
    let msgReponse = `▶️ `;
    if (indexDateEvent >= 0) {
        grp.dateEvent.splice(indexDateEvent, 1);

        titreReponse += 'Rdv enlevé 🚮';
        msgReponse += `Session enlevée, le **${dateVoulue + ' à ' + heureVoulue}** !`;
        logger.info(`.. date ${dateEvent} retiré`);
    } else {
        // sinon on l'ajoute, dans le bon ordre
        grp.dateEvent.push(dateEvent);
        
        titreReponse += 'Rdv ajouté 🗓️';
        msgReponse += `Session ajoutée, le **${dateVoulue + ' à ' + heureVoulue}** !`;
        logger.info(`.. date ${dateEvent} ajouté`);
    }

    grp.dateUpdated = Date.now();
    grp.save();

    // créer/update rappel
    if (indexDateEvent > 0)
        deleteRappelJob(client, grp, dateEvent.toDate());
    else
        createRappelJob(client, interaction.guildId, [grp]);

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);

    const newMsgEmbed = new MessageEmbed()
        .setTitle(titreReponse)
        .setDescription(msgReponse);
    return interaction.editReply({ embeds: [newMsgEmbed] });
}

const dissolve = async (interaction, options) => {
    const grpName = options.get('nom')?.value;
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES);
    
    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

    // recup le groupe
    let grp = await client.findGroupByName(grpName);
    if (!grp) 
        return interaction.reply({ embeds: [createError(`Le groupe ${grpName} n'existe pas !`)] });
        
    // si l'author n'est pas capitaine et non admin
    if (!isAdmin && !grp.captain._id.equals(authorDB._id))
        return interaction.reply({ embeds: [createError(`Tu n'es pas capitaine du groupe ${grpName} !`)] });
    
    dissolveGroup(client, interaction.guildId, grp)
    
    // suppression channel discussion
    if (grp.channelId) {
        const channel = interaction.guild.channels.cache.get(grp.channelId);
        channel.delete("Groupe supprimé");
    }

    let mentionsUsers = '';
    for (const member of grp.members)
        mentionsUsers += `<@${member.userId}> `

    // envoi dans channel log
    createLogs(client, interaction.guildId, `${WARNING} Dissolution d'un groupe`, `Le groupe **${grpName}** a été dissout.
                                                            Membres concernés : ${mentionsUsers}`);
    
    logger.info(`${author.user.tag} a dissout le groupe ${grpName}`);
    await interaction.reply(`${mentionsUsers} : le groupe **${grpName}** a été dissout !`);
}

const transfert = async (interaction, options) => {
    const grpName = options.get('nom')?.value;
    const newCaptain = options.get('membre')?.member; // USER
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES);

    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });
    let newCaptainDB = await client.getUser(newCaptain);
    if (!newCaptainDB)
        return interaction.reply({ embeds: [createError(`${newCaptain} n'a pas de compte ! Merci de t'enregistrer avec la commande : \`/register\``)] });

    // recup le groupe
    let grp = await client.findGroupByName(grpName);
    if (!grp) 
        return interaction.reply({ embeds: [createError(`Le groupe **${grpName}** n'existe pas !`)] });
        
    // si l'author n'est pas admin et n'est pas capitaine 
    if (!isAdmin && !grp.captain._id.equals(authorDB._id))
        return interaction.reply({ embeds: [createError(`Tu n'es pas capitaine du groupe **${grpName}** !`)] });
    
    // si le nouveau capitaine fait parti du groupe
    let memberGrp = grp.members.find(u => u._id.equals(newCaptainDB._id));
    if (!memberGrp)
        return interaction.reply({ embeds: [createError(`${newCaptain} ne fait pas parti du groupe **${grpName}** !`)] });

    // update du groupe : captain
    await client.update(grp, {
        captain: newCaptainDB,
        dateUpdated: Date.now()
    })

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);
    logger.info(`${author.user.tag} vient de nommer ${newCaptain.user.tag} capitaine du groupe ${grpName}`);
    const newMsgEmbed = new MessageEmbed()
        .setDescription(`${CHECK_MARK} ${newCaptain} est le nouveau capitaine du groupe **${grpName}** !`);
    await interaction.reply({ embeds: [newMsgEmbed] });
}

const end = async (interaction, options) => {
    const grpName = options.get('nom')?.value;
    const client = interaction.client;
    const author = interaction.member;
    const guild = interaction.guild;
    const guildId = interaction.guildId;
    
    const isAdmin = author.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES);

    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });
        
    // recup le groupe
    let grp = await client.findGroupByName(grpName);
    if (!grp) 
        return interaction.reply({ embeds: [createError(`Le groupe ${grpName} n'existe pas !`)] });
    
    // si l'author n'est pas admin et n'est pas capitaine
    if (!isAdmin && !grp.captain._id.equals(authorDB._id))
        return interaction.reply({ embeds: [createError(`Tu n'es pas capitaine du groupe ${grp.name} !`)] });

    await client.update(grp, { validated: true });

    // archivage du channel de discussion
    const idArchDiscussionGroupe = await client.getGuildChannel(guildId, SALON.CAT_ARCHIVE_DISCUSSION_GROUPE);
    let catArchive = await interaction.guild.channels.cache.get(idArchDiscussionGroupe);
    if (!catArchive) {
        logger.error("Catégorie archives des discussions de groupe n'existe pas ! Création en cours...");
        const nameCat = "Archives discussions groupes";
        catArchive = await interaction.guild.channels.create(nameCat, {
            type: "GUILD_CATEGORY"
        });
        await GuildConfig.updateOne(
            { guildId: guildId },
            { $set: { ["channels." + SALON.CAT_ARCHIVE_DISCUSSION_GROUPE] : catArchive.id } }
        );
        logger.info(`Catégorie "${nameCat}" créé avec succès`);
    }

    if (grp.channelId) {
        const channel = await guild.channels.cache.get(grp.channelId);
        channel.setParent(catArchive);
        channel.permissionOverwrites.set([{
            id: guild.roles.everyone.id,
            deny: ['VIEW_CHANNEL', 'SEND_MESSAGES']
        }, {
            id: author.id,
            allow: ['VIEW_CHANNEL'],
            deny: ['SEND_MESSAGES']
        }]);
    }

    let mentionsUsers = '';
    for (const member of grp.members)
        mentionsUsers += `<@${member.userId}> `

    // - MONEY
    // X = [[(Valeur du joueur de base ( 20)+ (5 par joueur supplémentaire)] X par le nombre de joueur total inscrit]] + 50 par session 
    const base = 20, baseJoueur = 5, baseSession = 50;
    const nbSession = grp.dateEvent.length;
    const nbJoueur = grp.size;
    let prize = ((base + (baseJoueur * nbJoueur)) * nbJoueur) + (baseSession * nbSession);
    
    logger.info(`${author.user.tag} a validé le groupe ${grp.name}`);
    const newMsgEmbed = new MessageEmbed()
        .setTitle(`${CHECK_MARK} Bravo ! Vous avez terminé l'évènement du groupe ${grp.name}`)
        .setDescription(`Vous gagnez chacun **${prize}** ${MONEY} ! 💰`);
    await interaction.reply({ content: mentionsUsers, embeds: [newMsgEmbed] });

    endGroup(client, interaction.guildId, grp);
}

const kick = async (interaction, options) => {
    const grpName = options.get('nom')?.value;
    const toKicked = options.get('membre')?.member; // USER
    const client = interaction.client;
    const author = interaction.member;

    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });
    let toKickedDB = await client.getUser(toKicked);
    if (!toKickedDB)
        return interaction.reply({ embeds: [createError(`${toKicked} n'a pas de compte ! Merci de t'enregistrer avec la commande : \`/register\``)] });

    // recup le groupe
    let grp = await client.findGroupByName(grpName);
    if (!grp) 
        return interaction.reply({ embeds: [createError(`Le groupe **${grpName}** n'existe pas !`)] });

    // si user a kick est capitaine
    if (grp.captain._id.equals(toKickedDB._id))
        return interaction.reply({ embeds: [createError(`Tu ne peux pas kick le capitaine du groupe **${grpName}** !`)] });

    // si l'author n'est pas capitaine ou non admin
    const isAdmin = author.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES);
    if (!isAdmin && !grp.captain._id.equals(authorDB._id))
        return interaction.reply({ embeds: [createError(`Tu n'es pas capitaine du groupe **${grpName}** !`)] });

    // si le user a kick fait parti du groupe
    let memberGrp = grp.members.find(u => u._id.equals(toKickedDB._id));
    if (!memberGrp)
        return interaction.reply({ embeds: [createError(`${toKicked} ne fait pas parti du groupe **${grpName}** !`)] });

    // update du groupe : size -1 et maj members
    leaveGroup(interaction.client, interaction.guildId, grp, toKickedDB)

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);
    logger.info(`${author.user.tag} vient de kick ${toKicked.user.tag} du groupe ${grpName}`);
    
    const kickLogEmbed = new MessageEmbed()
        .setTitle(`Kick d'un groupe`)
        .setDescription(`**${author.user.tag}** vient de kick **${toKicked.user.tag}** du groupe **${grpName}**`);
    const kickEmbed = new MessageEmbed()
        .setDescription(`${CHECK_MARK} ${toKicked} a été kick du groupe **${grpName}** !`);
    
    // - send logs
    sendLogs(interaction.client, interaction.guildId, kickLogEmbed)

    await interaction.reply({ embeds: [kickEmbed] });
}

module.exports.help = MESSAGES.COMMANDS.CDS.GROUP;