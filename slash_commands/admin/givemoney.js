const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { GREEN } = require("../../data/colors.json");
const { PREFIX, MONEY } = require('../../config');
const { sendError, sendLogs, createError } = require('../../util/envoiMsg');

module.exports.run = async (interaction) => {
    // TODO permissions
    /* if (!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) 
        return sendError(message, `Vous n'avez pas la permission pour exécuter cette commande !`, 'givemoney') ; */
    const id = interaction.options.get('user')?.value;
    const montant = interaction.options.get('money')?.value;
    const client = interaction.client;
    const author = interaction.member;
    let user = interaction.user;
    let member;
    
    if (id) {
        member = await interaction.guild.members.fetch(id).catch(e => {});
        if (!member) {
            const embed = new MessageEmbed().setColor('#e74c3c').setDescription('Invalide ID.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        //user = member.user;
    }
    const dbUser = await client.getUser(member);
    if (!dbUser) { // Si pas dans la BDD
        const embedErr = createError(`${member.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`${PREFIX}register\``)
        return interaction.reply({ embeds: [embedErr] });
    }
    
    let money = dbUser.money;
    money += montant;
    if (money < 0) {
        montant -= money;
        money = 0;
    }
    const msgCustom = `${author} ${(montant > 0 ? `à donné` : `à retiré`)} **${montant}** ${MONEY} à ${member.user}\nSon argent est désormais de : **${money}** ${MONEY}`;

    await client.update(dbUser, { money: money });
    logger.warn(`${user.tag} a effectué la commande admin : ${MESSAGES.COMMANDS.ADMIN.GIVEMONEY.name} ${montant}`);
    sendLogs(client, `Modification ${MONEY}`, `${msgCustom}`, '', GREEN)

    const embed = new MessageEmbed()
        .setColor(GREEN)
        .setDescription(`${msgCustom}`);
        
        // TODO : APPELER EVENT CUSTOM POUR ENVOYER LOG
    return interaction.reply({ embeds: [embed] });
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.GIVEMONEY;
