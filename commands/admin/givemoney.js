const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { CROSS_MARK } = require('../../data/emojis.json');
const { DARK_RED, GREEN } = require("../../data/colors.json");
const { PREFIX, MONEY } = require('../../config');

module.exports.run = async (client, message, args) => {
    if(!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) error(`Vous n'avez pas la permission pour exécuter cette commande !`) ;

    if(!message.mentions.users.first()) return error(`Merci de mentionner l'utilisateur. Commande attendue : \`${PREFIX}givemoney <user mention> <montant>\``);
    const user = message.mentions.users.first();
    const member = message.guild.members.cache.get(user.id);
    if(!member || !args[1]) return error(`Mauvais arguments. Commande attendue : \`${PREFIX}givemoney <user mention> <montant>\`\nRappel: le montant peut être positif comme négatif et uniquement un entier.`);

    let montant;
    if(Number(args[1])) {
        montant = Number(args[1]);
    } else {
        return error(`L'argent rentré : "${args[1]}" n'est pas valide ! Le montant doit être un entier positif ou négatif.`)
    }

    const dbUser = await client.getUser(member);
    if(!dbUser) return error(`Cette utilisateur n'est pas inscrit !`);
    
    let money = dbUser.money;
    money += montant;
    if(money < 0) {
        montant -= money;
        money = 0;
    }
    let msgCustom = montant > 0 ? `à donné` : `à retiré`;

    await client.update(dbUser, { money: money });
    console.log(`\x1b[31m[WARN] \x1b[0m ${message.author.tag} a effectué la commande admin : ${MESSAGES.COMMANDS.ADMIN.GIVEMONEY.name}`);
    const embed = new MessageEmbed()
        .setColor(GREEN)
        .setDescription(`${message.author} ${msgCustom} **${montant}** ${MONEY} à ${member.user}\nSon argent est désormais de : ${money} ${MONEY}`);
    message.channel.send({embeds: [embed]});

    // TODO : APPELER EVENT CUSTOM POUR ENVOYER LOG

    function error(err) {
        const embedError = new MessageEmbed()
            .setColor(DARK_RED)
            .setTitle(`${CROSS_MARK} | ${err}`);
    
        return message.channel.send({embeds: [embedError]});
    }
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.GIVEMONEY;