const { MessageEmbed } = require('discord.js');
const { GUILD_ID, CHANNEL } = require("../../config");
const { DARK_RED, GREEN, YELLOW, NIGHT } = require("../../data/colors.json");
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const moment = require('moment');
const { Group, User } = require('../../models');

/**
 * Retourne les @ des membres faisant partie du groupe, sauf le capitaine
 * @param {*} group Groupe (DB)
 * @param {*} members Collection de Members
 * @returns String, chaque @ suivi d'un saut de ligne
 */
function getMembersList(group, members) {
    const memberCaptain = members.get(group.captain.userId);
    let membersStr = ``;
    // récupère les @ des membres
    for (const member of group.members) {
        const crtMember = members.get(member.userId);
        if (crtMember !== memberCaptain)
            membersStr += `${crtMember.user}\n`;
    }
    return membersStr ? membersStr : '*Personne 😔*';
}

/**
 * Créer un message embed contenant les infos d'un group
 * @param {*} members Collection de tous les membres
 * @param {*} group Groupe (DB)
 * @param {*} isAuthorCaptain est-ce que l'auteur du msg qui a appelé cette méthode est le capitaine
 * @returns un msg embed
 */
 function createEmbedGroupInfo(members, group, isAuthorCaptain) {
    const memberCaptain = members.get(group.captain.userId);
    const membersStr = getMembersList(group, members);
    let color = '';
    if (group.validated) color = NIGHT;
    else if (group.size === 1) color = GREEN;
    else if (group.size === group.nbMax) color = DARK_RED;
    else color = YELLOW;
    const dateEvent = group.dateEvent ? moment(group.dateEvent).format("ddd Do MMM HH:mm") : "*Non définie*";

    const gameAppid = group.game.appid;
    const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${gameAppid})`;
    const completionistLink = `[Completionist](https://completionist.me/steam/app/${gameAppid})`;
    const steamGuidesLink = `[Steam Guides](https://steamcommunity.com/app/${gameAppid}/guides/?browsefilter=trend&requiredtags[]=Achievements#scrollTop=0)`;
    const links = `${astatLink} | ${completionistLink} | ${steamGuidesLink}`;

    // TODO icon plutot que l'image ? -> recup via API..
    const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${gameAppid}/header.jpg`;

    const newMsgEmbed = new MessageEmbed()
        .setTitle(`${group.validated ? '🏁' : ''}${isAuthorCaptain ? '👑' : ''} **${group.name}**`)
        .setColor(color)
        .setThumbnail(gameUrlHeader)
        .addFields(
            { name: 'Jeu', value: `${group.game.name}\n${links}`, inline: true },
            //{ name: 'Nb max joueurs', value: `${group.nbMax}`, inline: true },
            { name: 'Quand ?', value: `${dateEvent}`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },                  // 'vide' pour remplir le 3eme field et passé à la ligne
            { name: 'Capitaine', value: `${memberCaptain.user}`, inline: true },
            { name: `Membres [${group.size}/${group.nbMax}]`, value: `${membersStr}`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },                  // 'vide' pour remplir le 3eme field et passé à la ligne
        );

    if (group.desc)
        newMsgEmbed.setDescription(`*${group.desc}*`);
    return newMsgEmbed;
}

/**
 * Crée un nouveau msg embed dans le channel spécifique
 * et le sauvegarde en DB
 * @param {*} client 
 * @param {*} group Groupe (DB)
 */
 async function sendMsgHubGroup(client, group) {
    const members = client.guilds.cache.get(GUILD_ID).members.cache;
    const newMsgEmbed = createEmbedGroupInfo(members, group, false);

    // recuperation id message pour pouvoir l'editer par la suite
    let msg = await client.channels.cache.get(CHANNEL.LIST_GROUP).send({embeds: [newMsgEmbed]});
    await client.update(group, { idMsg: msg.id });
}


/**
 * Update un msg embed du channel spécifique
 * @param {*} client 
 * @param {*} group Groupe (DB)
 */
 async function editMsgHubGroup(client, group) {
    const members = client.guilds.cache.get(GUILD_ID).members.cache;
    const msg = await client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch(group.idMsg);
    const editMsgEmbed = createEmbedGroupInfo(members, group, false);
    
    editMsgEmbed.setFooter({ text: `${group.validated ? 'TERMINÉ - ' : ''}Dernière modif. ${moment().format('ddd Do MMM HH:mm')}`});

    await msg.edit({embeds: [editMsgEmbed]});
}

/**
 * Supprime un message
 * @param {*} client 
 * @param {*} group 
 */
 async function deleteMsgHubGroup(client, group) {
    const msg = await client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch(group.idMsg);
    await msg.delete();
}

/**
 * Créer un collecteur de réactions pour les messages Groupes
 * Si l'on clique sur la reaction, on s'ajoute au groupe (ssi on y est pas déjà et qu'on est pas le capitaine)
 * Sinon on se retire du groupe (sauf si on est le capitaine)
 * @param {*} client 
 * @param {*} msg le message
 * @param {*} grp le groupe provenant de la bdd
 */
 async function createReactionCollectorGroup(client, msg, grp) {
     // TODO recup grpDB a la volee ! pb lors d'un transfert
     // TOOD a revoir quand capitaine fait reaction
     const collector = await msg.createReactionCollector({ dispose: true });
     collector.on('collect', (r, u) => {
         if (!u.bot && r.emoji.name === 'check') {
             client.getUser(u)
             .then(async userDBJoined => {
                const grpDB = await Group.findOne({ _id: grp._id }).populate('captain members game');

                // si u est enregistré, non blacklisté, non capitaine, et pas déjà présent, il peut join le group
                if (userDBJoined && u.id !== grpDB.captain.userId && !userDBJoined.blacklisted && !grpDB.members.find(us => us.userId === u.id)) {
                    await joinGroup(client, grpDB, userDBJoined);
                } else {
                    // send mp explication
                    let raison = 'Tu ne peux rejoindre le groupe car ';
                    if (!userDBJoined) raison += `tu n'es pas enregistré.\n:arrow_right: Enregistre toi avec la commande ${PREFIX}register <steamid>`;
                    else if (userDBJoined.blacklisted) raison += `tu es blacklisté.`;
                    else raison += `tu es le capitaine du groupe !`;

                    // si user déjà dans event, on laisse la reaction, sinon on envoie raison
                    if (!grpDB.members.find(us => us.userId === u.id)) {
                        u.send(`${CROSS_MARK} ${raison}`);
                        r.users.remove(u.id);
                    }
                }
            });
        }
    });
    collector.on('remove', (r, u) => {
        if (!u.bot && r.emoji.name === 'check') {
            client.getUser(u)
            .then(async userDBLeaved => {
                const grpDB = await Group.findOne({ _id: grp._id }).populate('captain members game');
                // si u est capitaine, on remet? la reaction
                if (u.id !== grpDB.captain.userId && userDBLeaved) 
                    await leaveGroup(client, grpDB, userDBLeaved);
            });
        }
    });
    // collector.on('end', collected => msgChannel.clearReactions());
}

/**
 * Enlève un utilisateur d'un groupe
 * @param {*} grp Le groupe
 * @param {*} userDB L'utilisateur a enlever
 */
async function leaveGroup(client, grp, userDB) {
    // update du groupe : size -1, remove de l'user dans members
    let memberGrp = grp.members.find(u => u._id.equals(userDB._id));
    var indexMember = grp.members.indexOf(memberGrp);
    grp.members.splice(indexMember, 1);
    grp.size--;
    await client.update(grp, {
        members: grp.members,
        size: grp.size,
        dateUpdated: Date.now()
    })
    
    // update msg
    await editMsgHubGroup(client, grp);
    logger.info(userDB.username+" vient de quitter groupe "+grp.name);
}

/**
 * Ajouter un utilisateur dans un groupe
 * @param {*} grp Le groupe
 * @param {*} userDB L'utilisateur
 */
 async function joinGroup(client, grp, userDB) {
    grp.members.push(userDB);
    grp.size++;
    await client.update(grp, {
        members: grp.members,
        size: grp.size,
        dateUpdated: Date.now()
    });

    // stat ++
    await User.updateOne(
        { _id: userDB._id },
        { $inc: { "stats.group.joined" : 1 } }
    );

    // update msg
    await editMsgHubGroup(client, grp);
    logger.info(userDB.username+" vient de rejoindre groupe "+grp.name);
}

async function createGroup(client, newGrp) {
    let grpDB = await client.createGroup(newGrp);
    
    // stat ++
    await User.updateOne(
        { _id: newGrp.captain._id },
        { $inc: { "stats.group.created" : 1 } }
    );

    // creation msg channel
    await sendMsgHubGroup(client, grpDB);
    
    const msgChannel = await client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch(grpDB.idMsg);
    msgChannel.react(CHECK_MARK);

    // filtre reaction sur emoji
    await createReactionCollectorGroup(client, msgChannel, grpDB);
}

async function endGroup(client, grp) {
    // update msg
    await editMsgHubGroup(client, grp);

    // remove job
    deleteRappelJob(client, grp);

    // update info user
    // - XP
    // TODO faire une demande d'xp et c'est les admins qui disent "ok" ? en cas de fraude ?
    // TODO xp variable en fonction nb de personnes, si capitaine
    let xp = BAREME_XP.EVENT_END;

    // - Stat

    // TODO déplacer event terminé ?
    const msgChannel = await client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch(grp.idMsg);
    msgChannel.reactions.removeAll();
}

exports.getMembersList = getMembersList
exports.createEmbedGroupInfo = createEmbedGroupInfo
exports.sendMsgHubGroup = sendMsgHubGroup
exports.editMsgHubGroup = editMsgHubGroup
exports.deleteMsgHubGroup = deleteMsgHubGroup
exports.createReactionCollectorGroup = createReactionCollectorGroup
exports.leaveGroup = leaveGroup
exports.joinGroup = joinGroup
exports.createGroup = createGroup
exports.endGroup = endGroup