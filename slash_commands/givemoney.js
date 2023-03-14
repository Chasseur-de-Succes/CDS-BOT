const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const { MESSAGES } = require("../util/constants");
const { GREEN } = require("../data/colors.json");
const { createError, createLogs } = require('../util/envoiMsg');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givemoney')
        .setDescription("Donne ou retire à l'utilisateur mentionné, un montant d'argent")
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('Cet utilisateur en particulier')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('montant')
                .setDescription("Montant à donner ou à retirer")
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const client = interaction.client;
        const author = interaction.user;
        const user = interaction.options.getUser('target') ?? interaction.user;
        let member = interaction.guild.members.cache.get(user.id);
        let montant = interaction.options.get('montant')?.value;
        const MONEY = process.env.MONEY;

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin)
            return interaction.reply({ embeds: [createError(`Tu n'as pas le droit d'exécuter cette commande !`)], ephemeral: true });

        const dbUser = await client.getUser(member);
        if (!dbUser) { // Si pas dans la BDD
            const embedErr = createError(`${user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)
            return interaction.reply({ embeds: [embedErr] });
        }

        let money = dbUser.money;
        money += montant;
        if (money < 0) {
            montant -= money;
            money = 0;
        }
        const msgCustom = `${author} ${(montant > 0 ? `a donné` : `a retiré`)} **${Math.abs(montant)}** ${MONEY} à ${user}\nSon argent est désormais de : **${money}** ${MONEY}`;
    
        await client.update(dbUser, { money: money });
        logger.warn(`${author.tag} a effectué la commande admin : givemoney ${montant}`);
        createLogs(client, interaction.guildId, `Modification ${MONEY}`, `${msgCustom}`, '', GREEN)
    
        const embed = new EmbedBuilder()
            .setColor(GREEN)
            .setDescription(`${msgCustom}`);
            
            // TODO : APPELER EVENT CUSTOM POUR ENVOYER LOG
        return interaction.reply({ embeds: [embed] });
    },
}