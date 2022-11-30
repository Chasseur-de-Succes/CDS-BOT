const { MessageEmbed } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { GREEN } = require("../../data/colors.json");
//const { MONEY } = require('../../config');
const { createError } = require('../../util/envoiMsg');

module.exports.run = async (interaction) => {
    const user = interaction.options.get('user')?.value;
    const client = interaction.client;
    let member = interaction.member;

    if (user) {
        member = await interaction.guild.members.fetch(user).catch(e => {});
        if (!member) {
            const embed = new MessageEmbed().setColor('#e74c3c').setDescription('Invalide ID.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
    
    const dbUser = await client.getUser(member);
    if (!dbUser) // Si pas dans la BDD
        return interaction.reply({ embeds: [createError(`${member.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)] });

    const embed = new MessageEmbed()
        .setColor(GREEN)
        .setDescription(`💰 ${member.user} possède **${dbUser.money}** ${process.env.MONEY} 💰`);

    return interaction.reply({ embeds: [embed] });
}

module.exports.help = MESSAGES.COMMANDS.ECONOMY.MONEY;