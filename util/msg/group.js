const { MessageEmbed } = require('discord.js');
const { GUILD_ID, CHANNEL } = require("../../config");
const { dark_red, green, yellow, night } = require("../../data/colors.json");
const moment = require('moment');

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

function getAllMembers(group, members) {
    const memberCaptain = members.get(group.captain.userId);
    let membersStr = ``;
    // récupère les @ des membres
    for (const member of group.members) {
        const crtMember = members.get(member.userId);
        if (crtMember === memberCaptain) membersStr += `👑`;
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
    if (group.validated) color = night;
    else if (group.size === 1) color = green;
    else if (group.size === group.nbMax) color = dark_red;
    else color = yellow;
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
    await client.updateGroup(group, { idMsg: msg.id });
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
    
    editMsgEmbed.setFooter(`${group.validated ? 'TERMINÉ - ' : ''}Dernière modif. ${moment().format('ddd Do MMM HH:mm')}`);

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

exports.getAllMembers = getAllMembers
exports.getMembersList = getMembersList
exports.createEmbedGroupInfo = createEmbedGroupInfo
exports.sendMsgHubGroup = sendMsgHubGroup
exports.editMsgHubGroup = editMsgHubGroup
exports.deleteMsgHubGroup = deleteMsgHubGroup