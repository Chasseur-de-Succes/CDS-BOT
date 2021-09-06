const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const { MESSAGES, NB_MAX } = require('../../util/constants');
const { PREFIX } = require('../../config.js');

const { night, dark_red } = require("../../data/colors.json");
const { check_mark, cross_mark } = require('../../data/emojis.json');

function sendEmbedGroupInfo(message, group, toDM = false) {
    const memberCaptain = message.guild.members.cache.get(group.captain.userId);
    let isAuthorCaptain = message.author === memberCaptain.user;

    let membersStr = ``;
    for (const member of group.members) {
        const crtMember = message.guild.members.cache.get(member.userId);
        if (crtMember !== memberCaptain)
            membersStr += `${crtMember.user}\n`;
    }
    membersStr = membersStr ? membersStr : '*Personne 😔*';

    const newMsgEmbed = new MessageEmbed()
        .setTitle(`${isAuthorCaptain ? '👑' : ''} **${group.name}**`)
        .addFields(
            { name: 'Jeu', value: `${group.game.name}`, inline: true },
            { name: 'Nb max joueurs', value: `${group.nbMax}`, inline: true },
            { name: 'Capitaine', value: `${memberCaptain.user}`, inline: true },
            { name: `Membres [${group.size}/${group.nbMax}]`, value: `${membersStr}` },
        );

    // envoie en MP
    if (toDM)
        message.author.send({ embeds: [newMsgEmbed] });
    else 
        message.channel.send({ embeds: [newMsgEmbed] });
}

module.exports.run = async (client, message, args) => {
    if(!args[0]) {
        return message.channel.send(`Pour afficher l'aide de la commande: \`${PREFIX}${MESSAGES.COMMANDS.CDS.SEARCHGROUP.name} help\``);
    }
    else if(args[0] == "help") { // HELP
        const embed = new MessageEmbed()
            .setColor(night)
            .setDescription(`Permet de rechercher et de rejoindre (ou quitter) un groupe pour un jeu multijoueur`)
            .addField("Commandes", `- ${PREFIX}searchgroup search <game name> : cherche un groupe pour le jeu souhaité
                \n- ${PREFIX}searchgroup list : affiche la liste des groupes rejoint
                \n- ${PREFIX}searchgroup join <name group> : rejoindre le groupe
                \n- ${PREFIX}searchgroup leave <name group> : quitter le groupe
                \n- ${PREFIX}searchgroup create <name group> <nb max> <game name> : créé un groupe de nb max joueurs (2 à 15) pour le jeu mentionné
                \n- ${PREFIX}searchgroup dissolve <name group> : dissout le groupe mentionné (capitaine du groupe uniquement)
                \n- ${PREFIX}searchgroup transfert <name group> <mention user> : transfert le statut capitaine du groupe à la personne mentionné`)
            .addField('Règles du nom de groupe', `- Ne peut contenir que des lettres [a ➔ z], des chiffres [0 ➔ 9] ou des caractères spéciaux : "-", "_", "&"
                - Le nom possède minimum 3 caractères et au maximum 15 caractères`);

        return message.channel.send({embeds: [embed]});
    }
    else if (args[0] == "search") {
        // CHERCHER UN GROUPE SUR UN NOM DE JEU DONNE
        // recup le reste des arguments : nom du jeu
        const gameName = args.slice(1).join(' ');
        try {
            if (!gameName) 
                throw `Il manque le nom du jeu !`;
            let groupes = await client.findGroupNotFullByGameName(gameName);
            //let groupes = await client.findGroupByGameName(gameName);
            
            if (groupes?.length === 0) 
                throw `Aucun groupe n'est disponible pour ce jeu`;
            else {
                for (const group of groupes) {
                    sendEmbedGroupInfo(message, group)
                }
            }
            
        } catch (err) {
            const embedError = new MessageEmbed()
                .setColor(dark_red)
                .setTitle(`${cross_mark} ${err}`);
            console.log(`\x1b[31m[ERROR] \x1b[0mErreur searchgroup ${args[0]} : ${err}`);
            return message.channel.send({ embeds: [embedError] });
        }
    }
    else if(args[0] == "list") { // LIST
        // afficher liste des groupes rejoints (+ préciser quand capitaine du groupe)
        let author = message.author;
        try {
            let userDB = await client.getUser(author);
            if (!userDB)
                throw `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``;

            let groups = await client.findGroupByUser(userDB);

            if (groups?.length > 0) {
                author.send(`Liste des groupes dont tu fais partie *(👑 = tu es capitaine)* :`);
                for (const group of groups) {
                    const memberCaptain = message.guild.members.cache.get(group.captain.userId);
                    let isAuthorCaptain = author === memberCaptain.user;

                    let membersStr = ``;
                    for (const member of group.members) {
                        const crtMember = message.guild.members.cache.get(member.userId);
                        if (crtMember !== memberCaptain)
                            membersStr += `${crtMember.user}\n`;
                    }
                    membersStr = membersStr ? membersStr : '*Personne :(*';

                    const newMsgEmbed = new MessageEmbed()
                        .setTitle(`${isAuthorCaptain ? '👑' : ''} **${group.name}**`)
                        .addFields(
                            { name: 'Jeu', value: `${group.game.name}`, inline: true },
                            { name: 'Nb max joueurs', value: `${group.nbMax}`, inline: true },
                            { name: 'Capitaine', value: `${memberCaptain.user}`, inline: true },
                            { name: 'Membres', value: `${membersStr}` },
                        );
                    
                    // envoie en MP
                    author.send({ embeds: [newMsgEmbed] });
                    // petite reaction sur le message original pour dire que c'est ok
                    message.react(check_mark);
                    //message.channel.send({ embeds: [newMsgEmbed] });
                }
            } else 
                throw `Tu n'appartiens à aucun groupe.`
        } catch (err) {
            const embedError = new MessageEmbed()
                .setColor(dark_red)
                .setTitle(`${cross_mark} ${err}`);
            console.log(`\x1b[31m[ERROR] \x1b[0mErreur searchgroup ${args[0]} : ${err}`);
            return author.send({ embeds: [embedError] });
        }
    }
    else if(args[0] == "join") { // args : nom du group
        //REJOINT LE GROUPE SI IL RESTE ENCORE UNE PLACE
        const grpName = args[1];

        try {
            if (!grpName) 
                throw `Il manque le nom du groupe !`;
            
            // recup le groupe
            let grp = await client.findGroupByName(grpName);
            if (!grp) 
                throw `Le groupe ${grpName} n'existe pas !`;
            
            // test si grp complet
            if (grp.size === grp.nbMax)
                throw `Le groupe ${grpName} est déjà plein !`;
            
            // recup l'userDB pour test si le joueur est déjà dans le groupe
            let userDB = await client.getUser(message.author);
            if (!userDB)
                throw `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``;
            
            if (grp.members.some(u => u._id.equals(userDB._id))) {
                if (grp.captain._id.equals(userDB._id))
                    throw `Tu fais déjà parti du groupe ${grpName}, tu es le capitaine..`;
                else
                    throw `Tu fais déjà parti du groupe ${grpName} !`;
            }

            // update du groupe : size +1, ajout de l'user dans members
            grp.members.push(userDB);
            grp.size++;
            await client.updateGroup(grp, {
                members: grp.members,
                size: grp.size,
                dateUpdated: Date.now()
            })
            console.log(`\x1b[34m[INFO]\x1b[0m ${message.author.tag} vient de rejoindre groupe : ${grpName}`);
            const newMsgEmbed = new MessageEmbed()
                .setTitle(`${check_mark} Tu as bien rejoint le groupe **${grpName}** !`);
                /* .addFields(
                    { name: 'Jeu', value: `${grp.game.name}`, inline: true },
                    { name: 'Capitaine', value: `${captain}` },
                );*/
            message.channel.send({ embeds: [newMsgEmbed] });
        } catch(err) {
            const embedError = new MessageEmbed()
                .setColor(dark_red)
                .setTitle(`${cross_mark} ${err}`);
            console.log(`\x1b[31m[ERROR] \x1b[0mErreur searchgroup ${args[0]} : ${err}`);
            return message.channel.send({ embeds: [embedError] });
        }
    }
    else if(args[0] == "leave") { // LEAVE
        //QUITTE LE GROUPE
        const grpName = args[1];

        try {
            if (!grpName) 
                throw `Il manque le nom du groupe !`;
            
            // recup le groupe
            let grp = await client.findGroupByName(grpName);
            if (!grp) 
                throw `Le groupe ${grpName} n'existe pas !`;
            
            // recup l'userDB pour test si le joueur est bien dans le groupe
            let userDB = await client.getUser(message.author);
            if (!userDB)
                throw `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``;

            let memberGrp = grp.members.find(u => u._id.equals(userDB._id));
            if (!memberGrp)
                throw `Tu ne fais pas parti du groupe ${grpName} !`;
            
            // et s'il est capitaine => sg dissolve ou sg transfert
            if (grp.captain._id.equals(userDB._id))
                throw `Tu es capitaine du groupe ${grpName}, utilise plutôt searchgroup transfert ou searchgroup dissolve.`;
            
            // update du groupe : size -1, remove de l'user dans members
            var indexMember = grp.members.indexOf(memberGrp);
            grp.members.splice(indexMember, 1);
            grp.size--;
            await client.updateGroup(grp, {
                members: grp.members,
                size: grp.size,
                dateUpdated: Date.now()
            })
            console.log(`\x1b[34m[INFO]\x1b[0m ${message.author.tag} vient de quitter groupe : ${grpName}`);
            const newMsgEmbed = new MessageEmbed()
                .setTitle(`${check_mark} Tu as bien quitté le groupe **${grpName}** !`);
                /* .addFields(
                    { name: 'Jeu', value: `${grp.game.name}`, inline: true },
                    { name: 'Capitaine', value: `${captain}` },
                );*/
            message.channel.send({ embeds: [newMsgEmbed] });
        } catch (err) {
            const embedError = new MessageEmbed()
                .setColor(dark_red)
                .setTitle(`${cross_mark} ${err}`);
            console.log(`\x1b[31m[ERROR] \x1b[0mErreur searchgroup ${args[0]} : ${err}`);
            return message.channel.send({ embeds: [embedError] });
        }
    }
    else if(args[0] == "create") { // Créer groupe
        const captain = message.author;
        const nameGrp = args[1];
        const nbMaxMember = !!parseInt(args[2]) ? parseInt(args[2]) : null;
        // recup le reste des arguments : nom du jeu
        const gameName = args.slice(3).join(' ');
        // TODO description
        
        try {            
            if (!nameGrp || !nbMaxMember || !gameName) 
                throw `${PREFIX}searchgroup create **<name group>** **<nb max>** **<game name>**\n*Créé un groupe de nb max joueurs (2 à 15) pour le jeu mentionné*`;
            
            // test si captain est register
            let userDB = await client.getUser(captain);
            if (!userDB)
                throw `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``;
            
            // test nom groupe [a-Z0-9] avec accent, caracteres speciaux (pas tous), min 3, max 15
            let reg = /([A-Za-zÀ-ÿ0-9]|[&$&+,:;=?|'"<>.*()%!_-]){3,15}/
            // la regex test la taille mais pour l'utilisateur il vaut mieux lui dire d'où vient le pb
            if (nameGrp.length < 3)
                throw `> Le nombre **minimum** de caractères pour le nom d'un groupe est de **3**`;
            if (nameGrp.length > NB_MAX.GROUP.CHARNAME)
                throw `> Le nombre **maximum** de caractères pour le nom d'un groupe est de **${NB_MAX.GROUP.CHARNAME}**`;
            if (!nameGrp.match(reg))
                throw `> Le nom du groupe ne convient pas. Vérifiez les caractères spéciaux et pas d'espaces !`;

            // nb max member entre 2 et 25
            if (nbMaxMember < 2)
                throw `> Le nombre **minimum** de joueurs dans un groupe est de **2**`;
            if (nbMaxMember > NB_MAX.GROUP.MEMBER)
                throw `> Le nombre **maximum** de joueurs dans un groupe est de **${NB_MAX.GROUP.MEMBER}**`;

            // si nom groupe existe
            let grp = await client.findGroupByName(nameGrp);
            if (grp) 
                throw `> Le nom du groupe existe déjà. Veuillez en choisir un autre.`;

            // création de la regex sur le nom du jeu
            console.log(`\x1b[34m[INFO]\x1b[0m Recherche jeu Steam par nom : ${gameName}..`);
            let regGame = new RegExp(gameName, "i");

            let msgLoading = await message.channel.send(`Je suis en train de chercher le jeu..`);
            message.channel.sendTyping();

            // récupère les jeux en base en fonction d'un nom, et si celui ci a des succès et est Multi et/ou Coop
            let games = await client.findGames({
                name: regGame, 
                hasAchievements: true,
                $or: [{isMulti: true}, {isCoop: true}]
            });
            msgLoading.delete();

            console.log(`\x1b[34m[INFO]\x1b[0m .. ${games.length} jeu(x) trouvé(s)`);
            if (!games) throw 'Erreur lors de la recherche du jeu';
            if (games.length === 0) throw `Pas de résultat trouvé pour **${gameName}** !`;

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

            // row contenant le Select menu
            const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('select-games-' + message.author)
                        .setPlaceholder('Sélectionner le jeu..')
                        .addOptions(items)
                );

            const embed = new MessageEmbed()
                .setColor(night)
                .setTitle(`J'ai trouvé ${games.length} jeux, avec succès, en multi et/ou coop !`)
                .setDescription(`Lequel est celui que tu cherchais ?`);

            let msgEmbed = await message.channel.send({embeds: [embed], components: [row] });

            // attend une interaction bouton de l'auteur de la commande
            const filter = i => {return i.user.id === message.author.id}
            let interaction = await msgEmbed.awaitMessageComponent({
                filter,
                componentType: 'SELECT_MENU',
                // time: 10000
            });
            
            const gameId = interaction.values[0];
            console.log(`\x1b[34m[INFO]\x1b[0m .. Steam app ${gameId} choisi`);
            // on recupere le custom id "APPID_GAME"
            const game = await client.findGameByAppid(gameId);
            msgEmbed.delete();

            // creation groupe
            let newGrp = {
                name: nameGrp,
                nbMax: nbMaxMember,
                captain: userDB._id,
                members: [userDB._id],
                game: game[0]
            };
            await client.createGroup(newGrp);

            const newMsgEmbed = new MessageEmbed()
                .setTitle(`${check_mark} Le groupe **${nameGrp}** a bien été créé !`)
                .addFields(
                    { name: 'Jeu', value: `${game[0].name}`, inline: true },
                    { name: 'Nb max joueurs', value: `${nbMaxMember}`, inline: true },
                    { name: 'Capitaine', value: `${captain}` },
                );
            message.channel.send({ embeds: [newMsgEmbed] });
        } catch (err) {
            const embedError = new MessageEmbed()
                .setColor(dark_red)
                .setTitle(`${cross_mark} Impossible de créer le groupe.`)
                .setDescription(`${err}`);
            console.log(`\x1b[31m[ERROR] \x1b[0mErreur searchgroup ${args[0]} : ${err}`);
            return message.channel.send({ embeds: [embedError] });
        };
    }
    else if(args[0] == "dissolve" || args[0] == "disolve") { // Dissout groupe
        //DISSOUT LE GROUPE SI IL EST CAPITAINE
        const grpName = args[1];

        try {
            if (!grpName) 
                throw `Il manque le nom du groupe !`;
            
            // test si user register
            let userDB = await client.getUser(message.author);
            if (!userDB)
                throw `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``;

            // recup le groupe
            let grp = await client.findGroupByName(grpName);
            if (!grp) 
                throw `Le groupe ${grpName} n'existe pas !`;

            // si l'author n'est pas capitaine 
            if (!grp.captain._id.equals(userDB._id))
                throw `Tu n'es pas capitaine du groupe ${grpName} !`;
            
            // suppr groupe
            // TODO mettre juste un temoin suppr si l'on veut avoir une trace ? un groupHisto ?
            await client.deleteGroup(grp);
            console.log(`\x1b[34m[INFO]\x1b[0m ${message.author.tag} a dissout le groupe ${grpName}`);

            let mentionsUsers = '';
            for (const member of grp.members)
                mentionsUsers += `<@${member.userId}> `
            
            mentionsUsers += ` : le groupe ${grpName} a été dissout.`
            message.channel.send(mentionsUsers);
        } catch (err) {
            const embedError = new MessageEmbed()
                .setColor(dark_red)
                .setTitle(`${cross_mark} ${err}`);
            console.log(`\x1b[31m[ERROR] \x1b[0mErreur searchgroup ${args[0]} : ${err}`);
            return message.channel.send({ embeds: [embedError] });
        }
    }
    else if(args[0] == "transfert") { // Transfert le statut capitaine à un autre membre du groupe
        //TRANSFERT LE STATUT CAPITAINE A UN AUTRE MEMBRE DU GROUPE (VERIFIER S'IL EST CAPITAINE)
        const grpName = args[1];
        const newCaptain = message.mentions.members.first();

        try {
            // test args
            if (!grpName || !newCaptain) 
                throw `${PREFIX}searchgroup transfert **<name group>** **<mention membre>**\n*transfert le statut capitaine du groupe à la personne mentionné*`;

            // test si user register
            let userDB = await client.getUser(message.author);
            if (!userDB)
                throw `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``;
            let newCaptainDB = await client.getUser(newCaptain);
            if (!newCaptainDB)
                throw `${newCaptain.user.tag} n'a pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``;

            // recup le groupe
            let grp = await client.findGroupByName(grpName);
            if (!grp) 
                throw `Le groupe ${grpName} n'existe pas !`;
            
            // si l'author n'est pas capitaine 
            if (!grp.captain._id.equals(userDB._id))
                throw `Tu n'es pas capitaine du groupe ${grpName} !`;
            
            // si le nouveau capitaine fait parti du groupe
            let memberGrp = grp.members.find(u => u._id.equals(newCaptainDB._id));
            if (!memberGrp)
                throw `${newCaptain.user.tag} ne fait pas parti du groupe ${grpName} !`;

            // update du groupe : captain
            await client.updateGroup(grp, {
                captain: newCaptainDB,
                dateUpdated: Date.now()
            })
            console.log(`\x1b[34m[INFO]\x1b[0m ${message.author.tag} vient de nommer ${newCaptain.user.tag} capitaine du groupe : ${grpName}`);
            const newMsgEmbed = new MessageEmbed()
                .setTitle(`${check_mark} ${newCaptain.user.tag} est le nouveau capitaine du groupe **${grpName}** !`);
            message.channel.send({ embeds: [newMsgEmbed] });
        } catch (err) {
            const embedError = new MessageEmbed()
                .setColor(dark_red)
                .setTitle(`${cross_mark} ${err}`);
            console.log(`\x1b[31m[ERROR] \x1b[0mErreur searchgroup ${args[0]} : ${err}`);
            return message.channel.send({ embeds: [embedError] });
        }
    }
    else {
        return message.channel.send(`Commande non valide, référez-vous à la commande d'aide : \`${PREFIX}${MESSAGES.COMMANDS.CDS.SEARCHGROUP.name} help\``);
    }
}

module.exports.help = MESSAGES.COMMANDS.CDS.SEARCHGROUP;