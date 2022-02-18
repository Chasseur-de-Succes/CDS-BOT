const { MessageEmbed } = require('discord.js');
const { CHANNEL } = require('../config');
const { DARK_RED } = require("../data/colors.json");
const { CROSS_MARK } = require('../data/emojis.json');

/**
 * Créer un embed de type ERREUR
 * @param {*} text le texte a afficher
 * @returns un MessageEmbed
 */
module.exports.createError = (text) => {
    let embedError = new MessageEmbed()
        .setColor(DARK_RED)
        .setDescription(`${CROSS_MARK} • ${text}`);
    return embedError;
}

/**
 * Envoie un message d'erreur
 * @param {*} message objet Discord, va envoyé le message dans le même channel
 * @param {*} text le message
 * @param {*} cmd le nom de la commande qui a exécuté cet envoi
 * @returns 
 */
module.exports.sendError = (message, text, cmd) => {
    let embedError = this.createError(text);
    logger.error(`${message.author.username} - ${cmd} : ${text}`);
    return message.channel.send({ embeds: [embedError] });
}

/**
 * Envoie un message dans le channel de log
 * @param {*} client objet Discord, va envoyé le message dans le channel
 * @param {*} title le titre
 * @param {*} desc le msg du log
 * @param {*} footer facultatif (defaut '')
 * @param {*} color facultatif (defaut DARK_RED)
 * @returns 
 */
module.exports.sendLogs = (client, title, desc, footer = '', color = DARK_RED) => {
    const embedLog = new MessageEmbed()
        .setColor(color)
        .setTitle(`${title}`)
        .setDescription(desc)
        .setFooter({ text: footer});
    client.channels.cache.get(CHANNEL.LOGS).send({ embeds: [embedLog] });
}