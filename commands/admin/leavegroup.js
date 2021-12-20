const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const { DARK_RED} = require("../../data/colors.json");
const { editMsgHubGroup } = require('../../util/msg/group');

module.exports.run = async (client, message, args) => {
    try {
        // -- test si user a le droit de gérer les messages (admin)
        if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) 
        throw `Interdiction.`;
        
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
            throw `Le groupe ${grpName} n'existe pas !`;
        
        let memberGrp = grp.members.find(u => u.userId === memberToLeaveId);
        if (!memberGrp)
            throw `${memberToLeave.user.tag ?? memberToLeaveId} ne fais pas parti du groupe ${grpName} !`;

        // TODO si member est capitaine ? simuler un dissolve ou transfert ?
        // update du groupe : size -1, remove de l'user dans members
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
        logger.info((memberToLeave.user.tag ?? memberToLeaveId)+" a été kick du groupe : "+grpName);
        message.react(CHECK_MARK)
    } catch (err) {
        const embedError = new MessageEmbed()
            .setColor(DARK_RED)
            .setTitle(`${CROSS_MARK} ${err}`);
        logger.error("Erreur leavegroupe "+ args[0]+ " : "+ err);
        return message.channel.send({ embeds: [embedError] });
    }
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.LEAVEGROUP;
