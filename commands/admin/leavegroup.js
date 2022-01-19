const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const { DARK_RED} = require("../../data/colors.json");
const { editMsgHubGroup } = require('../../util/msg/group');
const { sendError } = require('../../util/envoiMsg');

module.exports.run = async (client, message, args) => {
    // -- test si user a le droit de gérer les messages (admin)
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) 
        return sendError(message, `Interdiction.`, `leavegroup ${args[0]}`)
    
    let memberToLeave = message.mentions.members.first();
    let memberToLeaveId = memberToLeave ? memberToLeave.id : args.slice(0).join("");
    const grpName = args[1];

    if (!memberToLeaveId) 
        return message.reply('Veuillez spécifier un membre ou son ID.');
    if (!grpName)
        return message.reply('Veuillez spécifier le nom du groupe.');
    
    // recup le groupe
    let grp = await client.findGroupByName(grpName);
    if (!grp) 
        return sendError(message, `Le groupe ${grpName} n'existe pas !`, `leavegroup ${args[0]}`);
    
    let memberGrp = grp.members.find(u => u.userId === memberToLeaveId);
    if (!memberGrp)
        return sendError(message, `${memberToLeave.user.tag ?? memberToLeaveId} ne fais pas parti du groupe ${grpName} !`, `leavegroup ${args[0]}`);

    // TODO si member est capitaine ? simuler un dissolve ou transfert ?
    // update du groupe : size -1, remove de l'user dans members
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
    logger.info((memberToLeave.user.tag ?? memberToLeaveId)+" a été kick du groupe : "+grpName);
    message.react(CHECK_MARK)
    
    sendLogs(client, `${WARNING} Expulsion d'un groupe`, `${memberToLeave.user.tag ?? memberToLeaveId} a été kick du groupe : ${grpName} par ${message.author}`);
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.LEAVEGROUP;
