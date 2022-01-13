const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require('discord.js');
const { MESSAGES, NB_MAX } = require('../../util/constants');
const { PREFIX, CHANNEL } = require('../../config.js');
const moment = require('moment');

const { NIGHT, DARK_RED } = require("../../data/colors.json");
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const { editMsgHubGroup, deleteMsgHubGroup, createEmbedGroupInfo, sendMsgHubGroup, createReactionCollectorGroup } = require('../../util/msg/group');
const { createRappelJob, deleteRappelJob } = require('../../util/batch/batch');

/**
 * Envoie un msg embed en DM ou sur le channel du message
 */
function sendEmbedGroupInfo(message, group, toDM = false) {
    const members = message.guild.members.cache;
    const memberCaptain = members.get(group.captain.userId);
    let isAuthorCaptain = message.author === memberCaptain.user;
    const newMsgEmbed = createEmbedGroupInfo(members, group, isAuthorCaptain);

    // envoie en MP
    if (toDM)
        message.author.send({ embeds: [newMsgEmbed] });
    else 
        message.channel.send({ embeds: [newMsgEmbed] });
}

module.exports.run = async (client, message, args) => {
    if(!args[0]) {
        return message.channel.send(`Pour afficher l'aide de la commande: \`${PREFIX}${MESSAGES.COMMANDS.CDS.GROUP.name} help\``);
    }
    else if(args[0] == "help") { // HELP
        const embed = new MessageEmbed()
            .setColor(NIGHT)
            .setDescription(`Permet de rechercher et de rejoindre (ou quitter) un groupe pour un jeu multijoueur`)
            .addField("Commandes", `🔎 **${PREFIX}group search <game>**
                > *Cherche un groupe pour le jeu souhaité*\n
                📃 **${PREFIX}group list**
                > *Affiche la liste des groupes rejoint*\n
                ▶️ **${PREFIX}group join <group>**
                > *Rejoins le groupe*\n
                ◀️ **${PREFIX}group leave <group>**
                > *Quitte le groupe*\n
                🆕 **${PREFIX}group create <group> <nb max> <game>**
                > *Créé un groupe de nb max joueurs (2 à 15) pour le jeu mentionné*\n
                📆 **${PREFIX}group schedule <group> <date> <heure>**
                > *Planifie une date pour chasser sur le groupe donné, au format jj/mm/yy HH:MM*\n
                🔚 **${PREFIX}group end <group>**
                > *Clos le groupe pour le valider*\n
                💣 **${PREFIX}group dissolve <group>**
                > *Dissout le groupe mentionné (👑 only)*\n
                👑 **${PREFIX}group transfert <group> <mention user>**
                > *Transfert le statut capitaine du groupe à la personne mentionné*`)
            .addField('Règles du nom de groupe', `- *Seulement lettres [a ➔ z], chiffres [0 ➔ 9] ou caractères spéciaux : "-", "_", "&"*
                - *Minimum 3 caractères et maximum 15 caractères*`);

        return message.channel.send({embeds: [embed]});
    }
    else if(args[0] == "search") {
        // CHERCHER UN GROUPE SUR UN NOM DE JEU DONNE
        // recup le reste des arguments : nom du jeu
        const gameName = args.slice(1).join(' ');
        try {
            if (!gameName) 
                return sendError(`Il manque le nom du jeu !`);
            let groupes = await client.findGroupNotFullByGameName(gameName);
            
            if (groupes?.length === 0) 
                return sendError(`Aucun groupe n'est disponible pour ce jeu`);
            else {
                for (const group of groupes) {
                    sendEmbedGroupInfo(message, group)
                }
            }
            
        } catch (err) {
            const embedError = new MessageEmbed()
                .setColor(DARK_RED)
                .setTitle(`${CROSS_MARK} ${err}`);
            console.log(`\x1b[31m[ERROR] \x1b[0mErreur group ${args[0]} : ${err}`);
            return message.channel.send({ embeds: [embedError] });
        }
    }
    else if(args[0] == "list") { // LIST
        // afficher liste des groupes rejoints (+ préciser quand capitaine du groupe)
        let author = message.author;
        
        let userDB = await client.getUser(author);
        if (!userDB)
            return sendError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);

        let groups = await client.findGroupByUser(userDB);

        if (groups?.length > 0) {
            author.send(`Liste des groupes dont tu fais partie *(👑 = tu es capitaine)* :`);
            for (const group of groups) {
                sendEmbedGroupInfo(message, group, true);

                // petite reaction sur le message original pour dire que c'est ok
                message.react(CHECK_MARK);
            }
        } else 
            return sendError(`Tu n'appartiens à aucun groupe.`);
    }
    else if(args[0] == "join") { // args : nom du group
        //REJOINT LE GROUPE SI IL RESTE ENCORE UNE PLACE
        const grpName = args[1];

        if (!grpName) 
            return sendError(`Il manque le nom du groupe !`);
        
        // recup le groupe
        let grp = await client.findGroupByName(grpName);
        if (!grp) 
            return sendError(`Le groupe ${grpName} n'existe pas !`);
        
        // test si grp complet
        if (grp.size === grp.nbMax)
            return sendError(`Le groupe ${grpName} est déjà plein !`);
        
        // recup l'userDB pour test si le joueur est déjà dans le groupe
        let userDB = await client.getUser(message.author);
        if (!userDB)
            return sendError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);
        
        if (grp.members.some(u => u._id.equals(userDB._id))) {
            if (grp.captain._id.equals(userDB._id))
                return sendError(`Tu fais déjà parti du groupe ${grpName}, tu es le capitaine..`);
            else
                return sendError(`Tu fais déjà parti du groupe ${grpName} !`);
        }

        // update du groupe : size +1, ajout de l'user dans members
        joinGroup(grp, userDB);

        const newMsgEmbed = new MessageEmbed()
            .setTitle(`${CHECK_MARK} Tu as bien rejoint le groupe **${grpName}** !`);
            /* .addFields(
                { name: 'Jeu', value: `${grp.game.name}`, inline: true },
                { name: 'Capitaine', value: `${captain}` },
            );*/
        message.channel.send({ embeds: [newMsgEmbed] });
    }
    else if(args[0] == "leave") { // LEAVE
        //QUITTE LE GROUPE
        const grpName = args[1];

        if (!grpName) 
            return sendError(`Il manque le nom du groupe !`);
        
        // recup le groupe
        let grp = await client.findGroupByName(grpName);
        if (!grp) 
            return sendError(`Le groupe ${grpName} n'existe pas !`);
        
        // recup l'userDB pour test si le joueur est bien dans le groupe
        let userDB = await client.getUser(message.author);
        if (!userDB)
            return sendError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);

        let memberGrp = grp.members.find(u => u._id.equals(userDB._id));
        if (!memberGrp)
            return sendError(`Tu ne fais pas parti du groupe ${grpName} !`);
        
        // et s'il est capitaine => sg dissolve ou sg transfert
        if (grp.captain._id.equals(userDB._id))
            return sendError(`Tu es capitaine du groupe ${grpName}, utilise plutôt group transfert ou group dissolve.`);

        leaveGroup(grp, userDB);
        
        const newMsgEmbed = new MessageEmbed()
            .setTitle(`${CHECK_MARK} Tu as bien quitté le groupe **${grpName}** !`);
            /* .addFields(
                { name: 'Jeu', value: `${grp.game.name}`, inline: true },
                { name: 'Capitaine', value: `${captain}` },
            );*/
        message.channel.send({ embeds: [newMsgEmbed] });
    }
    else if(args[0] == "create") { // Créer groupe
        const captain = message.author;
        const nameGrp = args[1];
        const nbMaxMember = !!parseInt(args[2]) ? parseInt(args[2]) : null;
        // recup le reste des arguments : nom du jeu
        const gameName = args.slice(3).join(' ');
        
        if (!nameGrp || !nbMaxMember || !gameName) 
            return sendError(`${PREFIX}group create **<name group>** **<nb max>** **<game name>**\n*Créé un groupe de nb max joueurs (2 à 15) pour le jeu mentionné*`);
        
        // test si captain est register
        let userDB = await client.getUser(captain);
        if (!userDB)
            return sendError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);
        
        // test nom groupe [a-Z0-9] avec accent, caracteres speciaux (pas tous), min 3, max 15
        let reg = /([A-Za-zÀ-ÿ0-9]|[&$&+,:;=?|'"<>.*()%!_-]){3,15}/
        // la regex test la taille mais pour l'utilisateur il vaut mieux lui dire d'où vient le pb
        if (nameGrp.length < 3)
            return sendError(`Le nombre **minimum** de caractères pour le nom d'un groupe est de **3**`);
        if (nameGrp.length > NB_MAX.GROUP.CHARNAME)
            return sendError(`Le nombre **maximum** de caractères pour le nom d'un groupe est de **${NB_MAX.GROUP.CHARNAME}**`);
        if (!nameGrp.match(reg))
            return sendError(`Le nom du groupe ne convient pas. Vérifiez les caractères spéciaux et pas d'espaces !`);

        // nb max member entre 2 et 25
        if (nbMaxMember < 2)
            return sendError(`Le nombre **minimum** de joueurs dans un groupe est de **2**`);
        if (nbMaxMember > NB_MAX.GROUP.MEMBER)
            return sendError(`Le nombre **maximum** de joueurs dans un groupe est de **${NB_MAX.GROUP.MEMBER}**`);

        // si nom groupe existe
        let grp = await client.findGroupByName(nameGrp);
        if (grp) 
            return sendError(`Le nom du groupe existe déjà. Veuillez en choisir un autre.`);

        // création de la regex sur le nom du jeu
        console.log(`\x1b[34m[INFO]\x1b[0m Recherche jeu Steam par nom : ${gameName}..`);
        let regGame = new RegExp(gameName, "i");

        let msgLoading = await message.channel.send(`Je suis en train de chercher le jeu..`);
        message.channel.sendTyping();

        // récupère les jeux en base en fonction d'un nom, avec succès et Multi et/ou Coop
        let games = await client.findGames({
            name: regGame, 
            hasAchievements: true,
            $or: [{isMulti: true}, {isCoop: true}]
        });
        msgLoading.delete();

        console.log(`\x1b[34m[INFO]\x1b[0m .. ${games.length} jeu(x) trouvé(s)`);
        if (!games) return sendError('Erreur lors de la recherche du jeu');
        if (games.length === 0) return sendError(`Pas de résultat trouvé pour **${gameName}** !`);

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
        if (items.length > 25) return sendError(`Trop de jeux trouvés ! Essaie d'être plus précis stp.`);

        // row contenant le Select menu
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('select-games-' + message.author)
                    .setPlaceholder('Sélectionner le jeu..')
                    .addOptions(items)
            );

        let embed = new MessageEmbed()
            .setColor(NIGHT)
            .setTitle(`J'ai trouvé ${games.length} jeux, avec succès, en multi et/ou coop !`)
            .setDescription(`Lequel est celui que tu cherchais ?`);

        let msgEmbed = await message.channel.send({embeds: [embed], components: [row] });

        // attend une interaction bouton de l'auteur de la commande
        let filter, interaction;
        try {
            filter = i => {return i.user.id === message.author.id}
            interaction = await msgEmbed.awaitMessageComponent({
                filter,
                componentType: 'SELECT_MENU',
                time: 30000 // 5min
            });
        } catch (error) {
            msgEmbed.edit({ components: [] })
            return;
        }
        
        const gameId = interaction.values[0];
        console.log(`\x1b[34m[INFO]\x1b[0m .. Steam app ${gameId} choisi`);
        // on recupere le custom id "APPID_GAME"
        const game = await client.findGameByAppid(gameId);
        msgEmbed.delete();

        /** DESCRIPTION **/
        embed = new MessageEmbed()
            .setColor(NIGHT)
            .setTitle(`👑 Ok, une petite description ?`)
            .setDescription(`J'attends une réponse, elle sera enregistrée en tant que description de l'event.
                            \n*(succès à chasser, spécificités, etc)*`);
        msgEmbed = await message.channel.send({embeds: [embed] });

        // attend une reponse, du même auteur, dans meme channel
        filter = m => {return m.author.id === message.author.id}
        let response = await message.channel.awaitMessages({ filter, max: 1 });

        let desc = response.first().content;
        response.first().delete();
        msgEmbed.delete();

        // creation groupe
        let newGrp = {
            name: nameGrp,
            desc: desc,
            nbMax: nbMaxMember,
            captain: userDB._id,
            members: [userDB._id],
            game: game[0]
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
                { name: 'Jeu', value: `${game[0].name}`, inline: true },
                { name: 'Nb max joueurs', value: `${nbMaxMember}`, inline: true },
                { name: 'Capitaine', value: `${captain}`, inline: true },
            );

        message.channel.send({ embeds: [newMsgEmbed] });
    }
    else if(args[0] == "schedule" || args[0] == "planifie") {
        // prevoit une date pour un groupe donné, pour chasser les succes
        const nameGrp = args[1];
        const dateVoulue = args[2];
        const heureVoulue = args[3];
        
        if (!nameGrp || !dateVoulue || !heureVoulue) 
            return sendError(`${PREFIX}group schedule **<name group>** **<date>**\n*Planifie une date pour chasser sur le groupe donné, au format jj/mm/yy HH:MM*`);
        
        // recup le groupe
        let grp = await client.findGroupByName(nameGrp);
        if (!grp) 
            return sendError(`Le groupe ${nameGrp} n'existe pas !`);
        
        // test si user register
        let userDB = await client.getUser(message.author);
        if (!userDB)
            return sendError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);

        // si l'author n'est pas capitaine 
        if (!grp.captain._id.equals(userDB._id))
            return sendError(`Tu n'es pas capitaine du groupe ${grpName} !`);

        // test si date bon format
        if (!moment(dateVoulue + ' ' + heureVoulue, "DD/MM/YY HH:mm", true).isValid())
            return sendError(`${dateVoulue + ' ' + heureVoulue} n'est pas une date valide. Format accepté : jj/mm/yy HH:MM*`);

        // parse string to Moment (date)
        let dateEvent = moment(dateVoulue + ' ' + heureVoulue, 'DD/MM/YY HH:mm');

        await client.updateGroup(grp, {
            dateEvent: dateEvent,
            dateUpdated: Date.now()
        });

        // créer/update rappel
        createRappelJob(client, [grp]);

        // update msg
        await editMsgHubGroup(client, grp);

        console.log(`\x1b[34m[INFO]\x1b[0m .. date ${dateEvent} choisi`);
        const newMsgEmbed = new MessageEmbed()
            .setTitle(`${CHECK_MARK} RdV le **${dateVoulue + ' ' + heureVoulue}** !`);
        message.channel.send({ embeds: [newMsgEmbed] });
    }
    else if(args[0] == "dissolve" || args[0] == "disolve") { // Dissout groupe
        //DISSOUT LE GROUPE SI IL EST CAPITAINE
        const grpName = args[1];

        if (!grpName) 
            return sendError(`Il manque le nom du groupe !`);
        
        // test si user register
        let userDB = await client.getUser(message.author);
        if (!userDB)
            return sendError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);

        // recup le groupe
        let grp = await client.findGroupByName(grpName);
        if (!grp) 
            return sendError(`Le groupe ${grpName} n'existe pas !`);

        // si l'author n'est pas capitaine 
        if (!grp.captain._id.equals(userDB._id))
            return sendError(`Tu n'es pas capitaine du groupe ${grpName} !`);
        
        // delete rappel
        deleteRappelJob(client, grp);

        // suppr groupe
        // TODO mettre juste un temoin suppr si l'on veut avoir une trace ? un groupHisto ?
        await client.deleteGroup(grp);
        console.log(`\x1b[34m[INFO]\x1b[0m ${message.author.tag} a dissout le groupe ${grpName}`);

        let mentionsUsers = '';
        for (const member of grp.members)
            mentionsUsers += `<@${member.userId}> `
        
        mentionsUsers += ` : le groupe ${grpName} a été dissout.`
        message.channel.send(mentionsUsers);

        // update msg
        await deleteMsgHubGroup(client, grp);
    }
    else if(args[0] == "transfert") { // Transfert le statut capitaine à un autre membre du groupe
        //TRANSFERT LE STATUT CAPITAINE A UN AUTRE MEMBRE DU GROUPE (VERIFIER S'IL EST CAPITAINE)
        const grpName = args[1];
        const newCaptain = message.mentions.members.first();

        // test args
        if (!grpName || !newCaptain) 
            return sendError(`${PREFIX}group transfert **<name group>** **<mention membre>**\n*transfert le statut capitaine du groupe à la personne mentionné*`);

        // test si user register
        let userDB = await client.getUser(message.author);
        if (!userDB)
            return sendError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);
        let newCaptainDB = await client.getUser(newCaptain);
        if (!newCaptainDB)
            return sendError(`${newCaptain.user.tag} n'a pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);

        // recup le groupe
        let grp = await client.findGroupByName(grpName);
        if (!grp) 
            return sendError(`Le groupe ${grpName} n'existe pas !`);
        
        // si l'author n'est pas capitaine 
        if (!grp.captain._id.equals(userDB._id))
            return sendError(`Tu n'es pas capitaine du groupe ${grpName} !`);
        
        // si le nouveau capitaine fait parti du groupe
        let memberGrp = grp.members.find(u => u._id.equals(newCaptainDB._id));
        if (!memberGrp)
            return sendError(`${newCaptain.user.tag} ne fait pas parti du groupe ${grpName} !`);

        // update du groupe : captain
        await client.updateGroup(grp, {
            captain: newCaptainDB,
            dateUpdated: Date.now()
        })

        // update msg
        await editMsgHubGroup(client, grp);
        console.log(`\x1b[34m[INFO]\x1b[0m ${message.author.tag} vient de nommer ${newCaptain.user.tag} capitaine du groupe : ${grpName}`);
        const newMsgEmbed = new MessageEmbed()
            .setTitle(`${CHECK_MARK} ${newCaptain.user.tag} est le nouveau capitaine du groupe **${grpName}** !`);
        message.channel.send({ embeds: [newMsgEmbed] });
    }
    else if (args[0] == "end") {
        const grpName = args[1];
        if (!grpName) 
            return sendError(`Il manque le nom du groupe !`);
        
        // test si user register
        let userDB = await client.getUser(message.author);
        if (!userDB)
            return sendError(`Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);

        // recup le groupe
        let grp = await client.findGroupByName(grpName);
        if (!grp) 
            return sendError(`Le groupe ${grpName} n'existe pas !`);

        // si l'author n'est pas capitaine 
        if (!grp.captain._id.equals(userDB._id))
            return sendError(`Tu n'es pas capitaine du groupe ${grpName} !`);
        
        await client.updateGroup(grp, { validated: true });

        console.log(`\x1b[34m[INFO]\x1b[0m ${message.author.tag} a validé le groupe ${grpName}`);
        const newMsgEmbed = new MessageEmbed()
            .setTitle(`${CHECK_MARK} Bravo ! Vous avez terminé l'évènement du groupe ${grp.name}`);
        message.channel.send({ embeds: [newMsgEmbed] });

        // update msg
        await editMsgHubGroup(client, grp);

        // remove job
        deleteRappelJob(client, grp);

        const msgChannel = await client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch(grp.idMsg);
        msgChannel.reactions.removeAll();
    }
    else {
        return message.channel.send(`Commande non valide, référez-vous à la commande d'aide : \`${PREFIX}${MESSAGES.COMMANDS.CDS.GROUP.name} help\``);
    }

    async function leaveGroup(grp, userDB) {
        // update du groupe : size -1, remove de l'user dans members
        let memberGrp = grp.members.find(u => u._id.equals(userDB._id));
        var indexMember = grp.members.indexOf(memberGrp);
        grp.members.splice(indexMember, 1);
        grp.size--;
        await client.updateGroup(grp, {
            members: grp.members,
            size: grp.size,
            dateUpdated: Date.now()
        })
        
        // update msg
        await editMsgHubGroup(client, grp);
        console.log(`\x1b[34m[INFO]\x1b[0m ${userDB.username} vient de quitter groupe : ${grp.name}`);
    }

    async function joinGroup(grp, userDB) {
        grp.members.push(userDB);
        grp.size++;
        await client.updateGroup(grp, {
            members: grp.members,
            size: grp.size,
            dateUpdated: Date.now()
        });

        // update msg
        await editMsgHubGroup(client, grp);
        console.log(`\x1b[34m[INFO]\x1b[0m ${userDB.username} vient de rejoindre groupe : ${grp.name}`);
    }

    function sendError(msgError) {
        let embedError = new MessageEmbed()
            .setColor(DARK_RED)
            .setDescription(`${CROSS_MARK} • ${msgError}`);
        console.log(`\x1b[31m[ERROR] \x1b[0mErreur group : ${msgError}`);
        return message.channel.send({ embeds: [embedError] });
    }
}

module.exports.help = MESSAGES.COMMANDS.CDS.GROUP;