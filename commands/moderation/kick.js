const colors = require('../../data/colors.json');
const { MESSAGES } = require('../../util/constants');
const { Permissions } = require('discord.js');

module.exports.run = (client, message, args) => {
    // -- test si user a le droit de kick
    if (!message.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) return message.reply("Tu n'as pas le droit de kicker !")

    // façon plus courte ? a voir
    /* message.guild.members.kick(message.mentions.members.first() || args.slice(0).join(""))
        .then(banInfo => console.log(`Kicked ${banInfo.user?.tag ?? banInfo.tag ?? banInfo}`))
        .catch(console.error); */

    let memberToKick = message.mentions.members.first();
    let memberToKickId = memberToKick ? memberToKick.id : args.slice(0).join("");

    if (!memberToKickId) 
        return message.reply('Veuillez spécifier un membre ou son ID.');

    if (memberToKick) {
        module.exports.kick(message, memberToKick);
        /* if (!memberToKick.kickable) return message.reply('> Impossible de kick ' + memberToKick.displayName + ' !');
        
        console.log("Kick membre", memberToKick.displayName);
        memberToKick.kick()
            .then(m => message.channel.send(`> 👋 ${m.displayName} a été kické !`))
            .catch(err => message.reply('> Erreur, impossible de kick ' + memberToKick.displayName + ' !')); */
    } else if (memberToKickId) {
        // recupere d'abord le membre (s'il existe) pour le kick ensuite
        message.guild.members.fetch(memberToKickId)
        .then(m => module.exports.kick(message, m))
        .catch(err => message.reply('> ' + memberToKickId + ' n\'existe pas ou n\'est pas ou plus sur le serveur !'));
    }
}

module.exports.kick = (message, member) => {
    if (!member.kickable) return message.reply('> Impossible de kick ' + member.displayName + ' !');
        
    console.log("Kick membre", member.displayName);
    member.kick()
        .then(m => message.channel.send(`> 👋 ${m.displayName} a été kické !`))
        .catch(err => message.reply('> Erreur, impossible de kick ' + member.displayName + ' !'));
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.KICK;