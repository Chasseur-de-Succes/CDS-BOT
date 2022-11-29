const { MESSAGES, TAGS, delay, crtHour } = require('../../util/constants');
const { Permissions } = require('discord.js');
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const moment = require("moment");
const { Game } = require('../../models');

module.exports.run = async (client, message, args) => {
    // -- test si user a un droit assez elevé pour raffraichir la base de donnée de jeu
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) 
        return message.reply("Tu n'as pas le droit de refresh !")
    
    moment.updateLocale('fr', {relativeTime : Object});
    logger.info("Début refresh games ..");
    
    let msgProgress = await message.channel.send(`Ok c'est parti ! Cela peut prendre du temps.. 
    Récupération de tous les jeux..`);

    try {
        const msgFin = await client.fetchAllApps(msgProgress);

        msgProgress.edit(`${msgFin}`);
    } catch (err) {
        msgProgress.delete();
        message.react(CROSS_MARK);
        logger.error("Erreur refresh games : " + err);
        console.log(err);
        return;
    }
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.REFRESHGAMES;
