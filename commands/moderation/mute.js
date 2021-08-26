const colors = require('../../data/colors.json');
const { MESSAGES } = require('../../util/constants');
const { Permissions } = require('discord.js');

module.exports.run = (client, message, args) => {
    // -- test si user a le droit de mute
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_ROLES) && !message.member.permissions.has(Permissions.FLAGS.MUTE_MEMBERS)) 
        return message.reply("Tu n'as pas le droit de mute !")

    let memberToMute = message.mentions.members.first();
    let memberToMuteId = memberToMute ? memberToMute.id : args.slice(0).join("");

    if (!memberToMuteId) 
        return message.reply('Veuillez spécifier un membre ou son ID.');

    if (memberToMute) {
        module.exports.mute(message, memberToMute);
    } else if (memberToMuteId) {
        // recupere d'abord le membre (s'il existe) pour le mute ensuite
        message.guild.members.fetch(memberToMuteId)
        .then(m => module.exports.mute(message, m))
        .catch(err => message.reply('> ' + memberToMuteId + ' n\'existe pas ou n\'est pas sur le serveur !'));
    }
}

module.exports.mute = (message, member) => {
    const roleMuet = message.guild.roles.cache.find(role => role.name === 'Muet');
    if (!roleMuet) return message.reply("Il n'existe pas de rôle 'Muet'");
    
    // ajout du rôle "Muet"
    member.roles.add(roleMuet)
    .then(m => {
        message.channel.send(`> 🔇 ${m.displayName} a été **mute** ! `);
        console.log(`\x1b[34m[INFO] \x1b[0mMute ${member.displayName}`);
    })
    .catch(err => {
        message.reply('> Erreur, impossible de mute ' + member.displayName + ' ! ');
        console.log(`\x1b[31m[ERROR] \x1b[0m` + err);
    });

    // vocal    
    member.voice.setMute(true).catch(err => {
        console.log(`\x1b[33m[WARN] \x1b[0mL'utilisateur ${member.displayName} n'est connecté à aucun channel vocal.`);
    });
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.MUTE;