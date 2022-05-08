const { MessageActionRow, MessageSelectMenu, MessageEmbed, Permissions } = require("discord.js");
const { MESSAGES } = require("../../util/constants");
const { createError, createLogs } = require("../../util/envoiMsg");
const { NIGHT } = require("../../data/colors.json");
const { CHECK_MARK, WARNING } = require('../../data/emojis.json');
const { editMsgHubGroup, endGroup, createGroup, dissolveGroup } = require("../../util/msg/group");
const { createRappelJob } = require("../../util/batch/batch");
const moment = require('moment');

module.exports.run = async (interaction) => {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
        create(interaction, interaction.options)
    } else if (subcommand === 'schedule') {
        schedule(interaction, interaction.options)
    } else if (subcommand === 'dissolve') {
        dissolve(interaction, interaction.options)
    } else if (subcommand === 'transfert') {
        transfert(interaction, interaction.options)
    } else if (subcommand === 'end') {
        end(interaction, interaction.options)
    }
}

const create = async (interaction, options) => {
    const nameGrp = options.get('nom')?.value;
    const nbMaxMember = options.get('max')?.value; // INTEGER
    const gameName = options.get('jeu')?.value;
    const description = options.get('description')?.value;
    const client = interaction.client;
    const captain = interaction.member;
    
    // test si captain est register
    const captainDB = await client.getUser(captain);
    if (!captainDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

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
    let games = await client.findGames({
        name: regGame, 
        hasAchievements: true,
        $or: [{isMulti: true}, {isCoop: true}]
    });

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
    if (items.length > 25) return await interaction.editReply({ embeds: [createError(`Trop de jeux trouvés ! Essaie d'être plus précis stp.`)] });

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

    // creation groupe
    let newGrp = {
        name: nameGrp,
        desc: description,
        nbMax: nbMaxMember,
        captain: captainDB._id,
        members: [captainDB._id],
        game: game
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

    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

    // recup le groupe
    let grp = await client.findGroupByName(nameGrp);
    if (!grp) 
        return interaction.reply({ embeds: [createError(`Le groupe ${nameGrp} n'existe pas !`)] });
        
    // si l'author n'est pas capitaine 
    if (!grp.captain._id.equals(authorDB._id))
        return interaction.reply({ embeds: [createError(`Tu n'es pas capitaine du groupe ${grpName} !`)] });
    
    // test si date bon format
    if (!moment(dateVoulue + ' ' + heureVoulue, "DD/MM/YY HH:mm", true).isValid())
        return interaction.reply({ embeds: [createError(`${dateVoulue + ' ' + heureVoulue} n'est pas une date valide.\nFormat accepté : ***jj/mm/aa HH:MM***`)] });

    // parse string to Moment (date)
    let dateEvent = moment(dateVoulue + ' ' + heureVoulue, 'DD/MM/YY HH:mm');

    await client.update(grp, {
        dateEvent: dateEvent,
        dateUpdated: Date.now()
    });

    // créer/update rappel
    createRappelJob(client, interaction.guildId, [grp]);

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);

    logger.info(`.. date ${dateEvent} choisi`);
    const newMsgEmbed = new MessageEmbed()
        .setTitle(`${CHECK_MARK} RdV le **${dateVoulue + ' à ' + heureVoulue}** !`);
    return interaction.reply({ embeds: [newMsgEmbed] });
}

const dissolve = async (interaction, options, isAdmin = false) => {
    const grpName = options.get('nom')?.value;
    const client = interaction.client;
    const author = interaction.member;
    
    // -- test si user a le droit de gérer les messages (mode admin)
    if (isAdmin && !author.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) 
        return interaction.reply({ embeds: [createError(`Interdiction.`)] });
    
    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

    // recup le groupe
    let grp = await client.findGroupByName(grpName);
    if (!grp) 
        return interaction.reply({ embeds: [createError(`Le groupe ${grpName} n'existe pas !`)] });
        
    // si l'author n'est pas capitaine (non admin)
    if (!isAdmin && !grp.captain._id.equals(authorDB._id))
        return interaction.reply({ embeds: [createError(`Tu n'es pas capitaine du groupe ${grpName} !`)] });
    
    dissolveGroup(client, interaction.guildId, grp)
    
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
        
    // si l'author n'est pas capitaine 
    if (!grp.captain._id.equals(authorDB._id))
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

    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });
        
    // recup le groupe
    let grp = await client.findGroupByName(grpName);
    if (!grp) 
        return interaction.reply({ embeds: [createError(`Le groupe ${grpName} n'existe pas !`)] });
    
    // si l'author n'est pas capitaine
    if (!grp.captain._id.equals(authorDB._id))
        return interaction.reply({ embeds: [createError(`Tu n'es pas capitaine du groupe ${grp.name} !`)] });

    await client.update(grp, { validated: true });

    let mentionsUsers = '';
    for (const member of grp.members)
        mentionsUsers += `<@${member.userId}> `
    
    logger.info(`${author.user.tag} a validé le groupe ${grp.name}`);
    const newMsgEmbed = new MessageEmbed()
        .setTitle(`${CHECK_MARK} Bravo ! Vous avez terminé l'évènement du groupe ${grp.name}`);
    await interaction.reply({ content: mentionsUsers, embeds: [newMsgEmbed] });

    endGroup(client, interaction.guildId, grp);
}

module.exports.help = MESSAGES.COMMANDS.CDS.GROUP;