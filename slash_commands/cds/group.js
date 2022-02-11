const { MessageActionRow, MessageSelectMenu, MessageEmbed } = require("discord.js");
const { MESSAGES } = require("../../util/constants");
const { createError } = require("../../util/envoiMsg");
const { NIGHT } = require("../../data/colors.json");
const { CHECK_MARK, WARNING } = require('../../data/emojis.json');
const { sendMsgHubGroup, createReactionCollectorGroup, editMsgHubGroup } = require("../../util/msg/group");
const { CHANNEL } = require("../../config");
const { createRappelJob } = require("../../util/batch/batch");
const moment = require('moment');

module.exports.run = async (interaction) => {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
        create(interaction, interaction.options)
    } else if (subcommand === 'schedule') {
        schedule(interaction, interaction.options)
    } else if (subcommand === 'dissolve') {
        // deleteRole(interaction, interaction.options)
    } else if (subcommand === 'transfert') {
        // deleteRole(interaction, interaction.options)
    } else if (subcommand === 'end') {
        // deleteRole(interaction, interaction.options)
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
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`${PREFIX}register\``)] });

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
    if (!games) await interaction.editReply({ embeds: [createError(`Erreur lors de la recherche du jeu`)] });
    if (games.length === 0) await interaction.editReply({ embeds: [createError(`Pas de résultat trouvé pour **${gameName}** !`)] });

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
    if (items.length > 25) await interaction.editReply({ embeds: [createError(`Trop de jeux trouvés ! Essaie d'être plus précis stp.`)] });

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
    let grpDB = await client.createGroup(newGrp);

    // creation msg channel
    await sendMsgHubGroup(client, grpDB);

    const msgChannel = await client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch(grpDB.idMsg);
    msgChannel.react(CHECK_MARK);

    // filtre reaction sur emoji
    await createReactionCollectorGroup(client, msgChannel, grpDB);

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
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`${PREFIX}register\``)] });

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
    createRappelJob(client, [grp]);

    // update msg
    await editMsgHubGroup(client, grp);

    logger.info(`.. date ${dateEvent} choisi`);
    const newMsgEmbed = new MessageEmbed()
        .setTitle(`${CHECK_MARK} RdV le **${dateVoulue + ' à ' + heureVoulue}** !`);
    return interaction.reply({ embeds: [newMsgEmbed] });
}

module.exports.help = MESSAGES.COMMANDS.CDS.GROUP;