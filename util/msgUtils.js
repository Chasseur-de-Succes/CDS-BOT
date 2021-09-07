const { GUILD_ID, CHANNEL } = require("../config");

/**
 * Update un msg embed du channel spécifique
 * @param {*} client 
 * @param {*} group Groupe (DB)
 */
 async function editMsgHub(client, group) {
    const members = client.guilds.cache.get(GUILD_ID).members.cache;
    const msg = await client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch(group.idMsg);
    await msg.edit({embeds: [createEmbedGroupInfo(members, group, false)]});
}

/**
 * Supprime un message
 * @param {*} client 
 * @param {*} group 
 */
 async function deleteMsgHub(client, group) {
    const msg = await client.channels.cache.get(CHANNEL.LIST_GROUP).messages.fetch(group.idMsg);
    await msg.delete();
}

exports.editMsgHub = editMsgHub
exports.deleteMsgHub = deleteMsgHub