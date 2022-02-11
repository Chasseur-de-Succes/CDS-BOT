const { MessageActionRow, MessageSelectMenu, MessageEmbed } = require("discord.js");
const { MESSAGES } = require("../../util/constants");
const { createError } = require("../../util/envoiMsg");
const { NIGHT } = require("../../data/colors.json");
const { CHECK_MARK, WARNING } = require('../../data/emojis.json');
const { sendMsgHubGroup, createReactionCollectorGroup } = require("../../util/msg/group");
const { CHANNEL } = require("../../config");

module.exports.run = async (interaction) => {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
        createGroup(interaction, interaction.options)
    } else if (subcommand === 'delete') {
        // deleteRole(interaction, interaction.options)
    }
}

const createGroup = async (interaction, options) => {
    const nameGrp = options.get('nom')?.value;
    const nbMaxMember = options.get('max')?.value; // INTEGER
    const gameName = options.get('jeu')?.value;
    const description = options.get('description')?.value;
    const client = interaction.client;
    const guild = interaction.guild;
    const captain = interaction.member;

    console.log('salut', nameGrp, nbMaxMember, gameName);
    
    // test si captain est register
    const captainDB = await client.getUser(captain);
    if (!captainDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${member.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`${PREFIX}register\``)] });

    // test nom groupe [a-Z0-9] avec accent, caracteres speciaux (pas tous), min 3
    let reg = /([A-Za-zÀ-ÿ0-9]|[&$&+,:;=?|'"<>.*()%!_-]){3,}/
    // la regex test la taille mais pour l'utilisateur il vaut mieux lui dire d'où vient le pb
    if (nameGrp.length < 3) 
        return interaction.reply({ embeds: [createError(`Le nombre **minimum** de caractères pour le nom d'un groupe est de **3**`)] });
    
    // nb max member entre 2 et 25
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
    //await interaction.reply({ content: `Je suis en train de chercher le jeu..` });

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
    const row = new MessageActionRow()
    .addComponents(
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

module.exports.help = MESSAGES.COMMANDS.CDS.GROUP;