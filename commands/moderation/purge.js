const { MESSAGES } = require('../../util/constants');
const { Permissions } = require('discord.js');

module.exports.run = (client, message, args) => {
    // -- test si user a le droit de gérer les messages
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) 
        return message.reply("Tu n'as pas le droit de purge !")

    // argument 0 : nb de messages à purger
    const nbMsgToPurge = !!parseInt(message.content.split(' ')[1]) ? parseInt(message.content.split(' ')[1]) : null;

    if (!nbMsgToPurge) 
        return message.reply('Veuillez spécifier un nombre de message.');

    // +1 pour supprimer le message qu'on vient d'envoyer en plus
    message.channel.messages.fetch({ limit: nbMsgToPurge + 1 })
    .then(msgs => {
        message.channel.bulkDelete(msgs)
        .then(() => logger.info("Purge "+nbMsgToPurge+" messages de "+message.channel.name))
        .catch(err => logger.error("Erreur purge : " + err));
    })
    .catch(console.error)
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.PURGE;
