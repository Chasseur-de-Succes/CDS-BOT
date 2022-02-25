const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { GREEN } = require("../../data/colors.json");
const { PREFIX, MONEY } = require('../../config');
const { sendError, sendLogs } = require('../../util/envoiMsg');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) 
        return sendError(message, `Vous n'avez pas la permission pour exécuter cette commande !`, 'givemoney') ;

    if (!message.mentions.users.first()) 
        return sendError(message, `Merci de mentionner l'utilisateur. Commande attendue : \`${PREFIX}givemoney <user mention> <montant>\``, 'givemoney');
    const user = message.mentions.users.first();
    const member = message.guild.members.cache.get(user.id);
    if (!member || !args[1]) 
        return sendError(message, `Mauvais arguments. Commande attendue : \`${PREFIX}givemoney <user mention> <montant>\`\nRappel: le montant peut être positif comme négatif et uniquement un entier.`, 'givemoney');

    let montant;
    if (Number(args[1])) {
        montant = Number(args[1]);
    } else {
        return sendError(message, `L'argent rentré : "${args[1]}" n'est pas valide ! Le montant doit être un entier positif ou négatif.`, 'givemoney')
    }

    const dbUser = await client.getUser(member);
    if (!dbUser) 
        return sendError(message, `Cette utilisateur n'est pas inscrit !`, 'givemoney');
    
    let money = dbUser.money;
    money += montant;
    if(money < 0) {
        montant -= money;
        money = 0;
    }
    let msgCustom = montant > 0 ? `à donné` : `à retiré`;

    await client.update(dbUser, { money: money });
    logger.warn(message.author.tag+" a effectué la commande admin : "+MESSAGES.COMMANDS.ADMIN.GIVEMONEY.name);
    const embed = new MessageEmbed()
        .setColor(GREEN)
        .setDescription(`${message.author} ${msgCustom} **${montant}** ${MONEY} à ${member.user}\nSon argent est désormais de : **${money}** ${MONEY}`);
    message.channel.send({embeds: [embed]});

    // TODO : APPELER EVENT CUSTOM POUR ENVOYER LOG
    sendLogs(client, `Modification ${MONEY}`, 
        `${message.author} ${msgCustom} **${montant}** ${MONEY} à ${member.user}\nSon argent est désormais de : **${money}** ${MONEY}`,
        '', GREEN)
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.GIVEMONEY;
