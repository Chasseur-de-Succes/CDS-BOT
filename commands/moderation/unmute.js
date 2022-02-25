const colors = require('../../data/colors.json');
const { MESSAGES } = require('../../util/constants');
const { Permissions } = require('discord.js');

module.exports.run = (client, message, args) => {
    // -- test si user a le droit d'unmute
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_ROLES) && !message.member.permissions.has(Permissions.FLAGS.MUTE_MEMBERS)) 
        return message.reply("Tu n'as pas le droit d'unmute !")

    let memberToUnmute = message.mentions.members.first();
    let memberToUnmuteId = memberToUnmute ? memberToUnmute.id : args.slice(0).join("");

    if (!memberToUnmuteId) 
        return message.reply('Veuillez spécifier un membre ou son ID.');

    if (memberToUnmute) {
        module.exports.unmute(message, memberToUnmute);
    } else if (memberToUnmuteId) {
        // recupere d'abord le membre (s'il existe) pour l'unmute ensuite
        message.guild.members.fetch(memberToUnmuteId)
        .then(m => module.exports.unmute(message, m))
        .catch(err => message.reply('> ' + memberToUnmuteId + ' n\'existe pas ou n\'est pas sur le serveur !'));
    }
}

module.exports.unmute = (message, member) => {
    const roleMuet = message.guild.roles.cache.find(role => role.name === 'Muet');
    if (!roleMuet) return message.reply("Il n'existe pas de rôle 'Muet'");
    
    // suppression du rôle "Muet"
    member.roles.remove(roleMuet)
    .then(m => {
        message.channel.send(`> 🔊 ${m.displayName} a été **unmute** ! `);
        logger.info("Unmute "+member.displayName);
    })
    .catch(err => {
        message.reply('> Erreur, impossible d\'unmute ' + member.displayName + ' ! ');
        logger.error("Erreur unmute : " + err);
    });

    // vocal    
    member.voice.setMute(false).catch(err => {
        logger.warn("L'utilisateur "+member.displayName+" n'est connecté à aucun channel vocal.");
    });
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.UNMUTE;
