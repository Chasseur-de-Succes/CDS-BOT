const { SALON } = require("../util/constants");
const { createError, createLogs, sendLogs } = require("../util/envoiMsg");
const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, ChannelType, PermissionFlagsBits } = require("discord.js");
const { NIGHT } = require("../data/colors.json");
const { CHECK_MARK, WARNING } = require('../data/emojis.json');
const { editMsgHubGroup, endGroup, createGroup, dissolveGroup, leaveGroup, deleteRappelJob, joinGroup } = require("../util/msg/group");
const { createRappelJob } = require("../util/batch/batch");
const { GuildConfig, Game, Group } = require('../models');
const moment = require('moment-timezone');
const { escapeRegExp } = require("../util/util");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('group')
        .setDescription('Gestion des groupes')
        .setDMPermission(false)
        .addSubcommand(sub =>
            sub
                .setName('create')
                .setDescription("Créer un nouveau groupe, sur un jeu Steam")
                .addStringOption(option => option.setName('nom').setDescription("Nom du groupe").setRequired(true))
                .addStringOption(option => option.setName('jeu').setDescription("Nom du jeu").setRequired(true).setAutocomplete(true))
                .addIntegerOption(option => option.setName('max').setMinValue(0).setDescription("Nombre max de membres dans le groupe"))
                .addStringOption(option => option.setName('description').setDescription("Description du groupe, quels succès sont rechercher, spécificités, etc")))
        .addSubcommand(sub =>
            sub
                .setName('session')
                .setDescription("Ajoute/supprime une session pour un groupe. Un rappel sera envoyé aux membres 1j et 1h avant")
                .addStringOption(option => option.setName('nom').setDescription("Nom du groupe").setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName('jour').setDescription("Jour de l'événement, au format DD/MM/YY").setRequired(true))
                .addStringOption(option => option.setName('heure').setDescription("Heure de l'événement, au format HH:mm").setRequired(true)))
        .addSubcommand(sub =>
            sub
                .setName('dissolve')
                .setDescription("Dissoud un groupe et préviens les membres de celui-ci (👑 only)")
                .addStringOption(option => option.setName('nom').setDescription("Nom du groupe").setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub
                .setName('transfert')
                .setDescription("Transfert le statut de 👑capitaine à un autre membre du groupe (👑 only)")
                .addStringOption(option => option.setName('nom').setDescription("Nom du groupe").setRequired(true).setAutocomplete(true))
                .addUserOption(option => option.setName('membre').setDescription("Membre du groupe, deviendra le nouveau capitaine 👑").setRequired(true)))
        .addSubcommand(sub =>
            sub
                .setName('end')
                .setDescription("Valide et termine un groupe (👑 only)")
                .addStringOption(option => option.setName('nom').setDescription("Nom du groupe").setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub
                .setName('kick')
                .setDescription("Kick un membre du groupe (👑 only)")
                .addStringOption(option => option.setName('nom').setDescription("Nom du groupe").setRequired(true).setAutocomplete(true))
                .addUserOption(option => option.setName('membre').setDescription("Membre du groupe à kick").setRequired(true)))
        .addSubcommand(sub =>
            sub
                .setName('nb-participant')
                .setDescription("Modifie le nombre de participants max (👑 only)")
                .addStringOption(option => option.setName('nom').setDescription("Nom du groupe").setRequired(true).setAutocomplete(true))
                .addIntegerOption(option => option.setName('max').setMinValue(0).setDescription("Nouveau nbre max de membres dans le groupe. Mettre 0 si infini.").setRequired(true)))
        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription("Ajoute un participant dans un groupe complet ou s'il a trop de groupes.")
                .addUserOption(option => option.setName('membre').setDescription("Membre à ajouter").setRequired(true))
                .addStringOption(option => option.setName('nom').setDescription("Nom du groupe").setRequired(true).setAutocomplete(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction) {
        const client = interaction.client;
        const focusedValue = interaction.options.getFocused(true);
        let filtered = [];
        let exact = [];
        
        // cmd group create, autocomplete sur nom jeu multi/coop avec succès
        if (focusedValue.name === 'jeu') {
            // recherche nom exacte
            exact = await client.findGames({
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
            filtered = filtered.filter(jeu => jeu.name && jeu.name !== exact[0]?.name);
        }

        // autocomplete sur nom groupe
        if (focusedValue.name === 'nom') {
            filtered = await Group.find({
                $and: [
                    { validated: false },
                    { name: new RegExp(escapeRegExp(focusedValue.value), 'i') },
                    { guildId: interaction.guildId }
                ]
            })
        }

        // 25 premiers + si nom jeu dépasse limite imposé par Discord (100 char)
        filtered = filtered
            .slice(0, 25)
            .map(element => element.name?.length > 100 ? element.name.substr(0, 96) + '...' : element.name);

        // si nom exact trouvé
        if (exact.length === 1) {
            const jeuExact = exact[0]
            // on récupère les 24 premiers
            filtered = filtered.slice(0, 24);
            // et on ajoute en 1er l'exact
            filtered.unshift(jeuExact.name)
        }

        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
        );
    },
    async execute(interaction) {
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
        } else if (subcommand === 'nb-participant') {
            editNbParticipant(interaction, interaction.options)
        } else if (subcommand === 'add') {
            forceAdd(interaction, interaction.options)
        }
    },
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
    const nbGrps = await client.getNbOngoingGroups(captain.id);

    if (!captainDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${captain.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

    if (captainDB.warning >= 3) {
        return interaction.reply({ embeds: [createError(`Tu n'as pas le droit de créer de nouveau groupe pour le moment !`)] });
    }

    if (nbGrps >= process.env.MAX_GRPS) {
        return interaction.reply({ embeds: [createError(`Tu as rejoins trop de groupes !`)] });
    }

    // la regex test la taille mais pour l'utilisateur il vaut mieux lui dire d'où vient le pb
    if (nameGrp.length < 3) 
        return interaction.reply({ embeds: [createError(`Le nombre **minimum** de caractères pour le nom d'un groupe est de **3**`)] });

    // si nom groupe existe
    let grp = await client.findGroupByName(nameGrp);
    if (grp) 
        return interaction.reply({ embeds: [createError(`Le nom du groupe existe déjà. Veuillez en choisir un autre.`)] });
    
    // création de la regex sur le nom du jeu
    logger.info(`Recherche jeu Steam par nom : ${gameName}..`);
    let regGame = new RegExp(escapeRegExp(gameName), "i");

    // "recherche.."
    await interaction.deferReply();

    // récupère les jeux en base en fonction d'un nom, avec succès et Multi et/ou Coop
    let games = await Game.aggregate([{
        '$match': { 'name': regGame }
    }, {
        '$match': { 'type': 'game' }
    }, {
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
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select-games-' + captain)
            .setPlaceholder('Sélectionner le jeu..')
            .addOptions(items)
    );

    let embed = new EmbedBuilder()
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
            componentType: ComponentType.StringSelect,
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
    const idDiscussionGroupe2 = await client.getGuildChannel(guildId, SALON.CAT_DISCUSSION_GROUPE_2);
    let cat = await client.channels.cache.get(idDiscussionGroupe);
    let cat2 = await client.channels.cache.get(idDiscussionGroupe2);
    if (!cat) {
        logger.info("Catégorie des discussions de groupe n'existe pas ! Création en cours...");
        const nameCat = "Discussions groupes";
        cat = await createCategory(nameCat, SALON.CAT_DISCUSSION_GROUPE, interaction);
    }

    if (cat.children.size >= 50) { // limite par Discord
        cat = cat2; // utiliser cat2 au lieu du 1
        if(!cat2) {
            logger.info("Catégorie des discussions de groupe 2 n'existe pas ! Création en cours...");
            const nameCat = "Discussion groupes 2";
            cat = await createCategory(nameCat, SALON.CAT_DISCUSSION_GROUPE_2, interaction);
        }
    }

    // création channel de discussion
    const channel = await interaction.guild.channels.create({
            name: nameGrp,
            type: ChannelType.GuildText,
            parent: cat,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: captain.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
            ],
    });

    for (const devID of process.env.DEVELOPERS.split(',')) {
        channel.permissionOverwrites.edit(devID, {
            ViewChannel: true, 
            SendMessages: true,
            MentionEveryone: true
        })
    }

    channel.send(`Bienvenue dans le channel du groupe : ${nameGrp}`);
    channel.send(`> ${captain} a créé le groupe`);

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

    const newMsgEmbed = new EmbedBuilder()
        .setTitle(`${CHECK_MARK} Le groupe **${nameGrp}** a bien été créé !`)
        .addFields(
            { name: 'Jeu', value: `${game.name}`, inline: true },
            { name: 'Capitaine', value: `${captain}`, inline: true },
        );

    if (nbMaxMember) {
        newMsgEmbed.addFields({ name: 'Nb max joueurs', value: `${nbMaxMember}`, inline: true })
    }

    await interaction.editReply({ embeds: [newMsgEmbed] });
}

const schedule = async (interaction, options) => {
    const nameGrp = options.get('nom')?.value;
    const dateVoulue = options.get('jour')?.value; // INTEGER
    const heureVoulue = options.get('heure')?.value;
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);

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
    let dateEvent = moment.tz(dateVoulue + ' ' + heureVoulue, allowedDateFormat, "Europe/Paris");
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
    if (indexDateEvent >= 0) {
        deleteRappelJob(client, grp, dateEvent.toDate());
    } else {
        createRappelJob(client, interaction.guildId, grp, dateEvent.toDate());
    }

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);
    
    // notif dans salon
    if (grp.channelId) {
        const guild = await client.guilds.cache.get(interaction.guildId);
        if (guild) {
            const channel = await guild.channels.cache.get(grp.channelId);
            
            if (channel) {
                const dateStr = `${dateVoulue} à ${heureVoulue}`;
                if (indexDateEvent >= 0) {
                    channel.send(`> ⚠️ La session du **${dateStr}** a été **supprimée**.`);
                } else {
                    channel.send(`> 🗓️ Nouvelle session le **${dateStr}** !`);
                }
            }
        }
    }

    const newMsgEmbed = new EmbedBuilder()
        .setTitle(titreReponse)
        .setDescription(msgReponse);
    return interaction.editReply({ embeds: [newMsgEmbed] });
}

const dissolve = async (interaction, options) => {
    const grpName = options.get('nom')?.value;
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);
    
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
        interaction.guild.channels.cache.get(grp.channelId)?.delete("Groupe supprimé");
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

    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);

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
    const newMsgEmbed = new EmbedBuilder()
        .setDescription(`${CHECK_MARK} ${newCaptain} est le nouveau capitaine du groupe **${grpName}** !`);
    await interaction.reply({ embeds: [newMsgEmbed] });
}

const end = async (interaction, options) => {
    const grpName = options.get('nom')?.value;
    const client = interaction.client;
    const author = interaction.member;
    const guild = interaction.guild;
    
    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);

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

    // si un seul participant
    if (grp.size === 1)
        return interaction.reply({ embeds: [createError(`Tu es seul.e dans le groupe.. Utilise plutôt \`/group dissolve ${grp.name}\` !`)] });

    await client.update(grp, { validated: true });

    // suppression du channel de discussion
    if (grp.channelId) {
        interaction.guild.channels.cache.get(grp.channelId)?.delete("Groupe terminé");
    } else {
        logger.error(`Le channel de discussion du groupe : ${grpName} n'existe pas ! Channel id : ${grp.channelId}`)
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
    const newMsgEmbed = new EmbedBuilder()
        .setTitle(`${CHECK_MARK} Bravo ! Vous avez terminé l'évènement du groupe ${grp.name}`)
        .setDescription(`Vous gagnez chacun **${prize}** ${process.env.MONEY} ! 💰`);
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
    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);
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
    
    const kickLogEmbed = new EmbedBuilder()
        .setTitle(`Kick d'un groupe`)
        .setDescription(`**${author.user.tag}** vient de kick **${toKicked.user.tag}** du groupe **${grpName}**`);
    const kickEmbed = new EmbedBuilder()
        .setDescription(`${CHECK_MARK} ${toKicked} a été kick du groupe **${grpName}** !`);
    
    // - send logs
    sendLogs(interaction.client, interaction.guildId, kickLogEmbed)

    await interaction.reply({ embeds: [kickEmbed] });
}

const editNbParticipant = async (interaction, options) => {
    const grpName = options.get('nom')?.value;
    const nbMax = options.get('max')?.value; // INTEGER
    const client = interaction.client;
    const author = interaction.member;

    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });
    
    // recup le groupe
    let grp = await client.findGroupByName(grpName);
    if (!grp) 
        return interaction.reply({ embeds: [createError(`Le groupe **${grpName}** n'existe pas !`)] });
    
    // si l'author n'est pas capitaine ou non admin
    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin && !grp.captain._id.equals(authorDB._id))
        return interaction.reply({ embeds: [createError(`Tu n'es pas capitaine du groupe **${grpName}** !`)] });

    // TODO tester si nbMax < size (membres)
    if (nbMax > 0)
        await client.update(grp, { nbMax: nbMax });
    else
        await Group.updateMany({_id: grp._id}, {$unset: { nbMax:1 }});

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);
    logger.info(`${author.user.tag} vient de modifier le nb de membres max par ${nbMax} du groupe ${grpName}`);
    
    const editLogEmbed = new EmbedBuilder()
        .setTitle(`Modif nb participant d'un groupe`)
        .setDescription(`**${author.user.tag}** vient de modifier le nb de membres max par **${nbMax}** du groupe **${grpName}**`);
    const editEmbed = new EmbedBuilder()
        .setDescription(`${CHECK_MARK} Nouveau nb de participant pour le groupe **${grpName}** : ${nbMax} !`);
    
    // - send logs
    sendLogs(interaction.client, interaction.guildId, editLogEmbed)

    await interaction.reply({ embeds: [editEmbed] });
}

const forceAdd = async (interaction, options) => {
    const grpName = options.get('nom')?.value;
    const toAdd = options.get('membre')?.member;
    const client = interaction.client;
    const author = interaction.member;

    const userDB = await client.getUser(toAdd);
    const grp = await Group.findOne({ name: grpName }).populate('captain members game');

    if (grp.members.filter(u => u.userId === toAdd.id).length >= 1) {
        interaction.reply({ content: `L'utilisateur ${toAdd} est déjà dans ${grpName}`, ephemeral: true });
    } else {
        await joinGroup(client, interaction.guildId, grp, userDB);
        interaction.reply({ content: `L'utilisateur ${toAdd} a été rajouté dans le groupe ${grpName}`, ephemeral: true });
    }
}

// Création catégorie discussions groupes
async function createCategory(nameCat, catConfig, interaction) {
    let cat = await interaction.guild.channels.create({
        name: nameCat,
        type: ChannelType.GuildCategory
    });
    await GuildConfig.updateOne(
        { guildId: interaction.guildId },
        { $set: { ["channels." + catConfig] : cat.id } }
    );
    logger.info(`Catégorie "${nameCat}" créé avec succès`);
    return cat;
}
