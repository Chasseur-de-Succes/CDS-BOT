const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { CHANNEL, WEBHOOK_ARRAY } = require("../util/constants");
const { GREEN } = require("../data/colors.json");
const { createLogs } = require('../util/envoiMsg');
const { GuildConfig } = require('../models');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('salon')
        .setDescription('Pour configurer les salons')
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('nom')
                .setDescription(`Nom du paramètre`)
                .setRequired(true)
                .setAutocomplete(true))
        .addChannelOption(option =>
            option
                .setName('salon')
                .setDescription("Nom du channel correspondant au paramètre"))
        .addStringOption(option =>
            option
                .setName('hook')
                .setDescription(`URL du webhook`))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction) {
        // cmd config, autocomplete sur nom param
        const focusedValue = interaction.options.getFocused(true);

        let filtered = [];
        if (focusedValue.name === 'nom')
            filtered = CHANNEL.concat(WEBHOOK_ARRAY)
        
        await interaction.respond(filtered);
    },
    async execute(interaction) {
        const nomConfig = interaction.options.get('nom')?.value;
        const salon = interaction.options.get('salon');
        const hook = interaction.options.get('hook')?.value;

        const guildId = interaction.guildId;
        const client = interaction.client;
        let user = interaction.user;

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin)
            return interaction.reply({ embeds: [createError(`Tu n'as pas le droit d'exécuter cette commande !`)], ephemeral: true });

        let msgCustom = '';

        if (salon) {
            msgCustom = `${salon.channel} est maintenant considéré comme '${nomConfig}'`;
    
            await GuildConfig.updateOne(
                { guildId: guildId },
                { $set: { ["channels." + nomConfig] : salon.value } }
            );
            // await client.update(guildDB, { channels: val });
            logger.warn(`${user.tag} a effectué la commande admin : /salon ${nomConfig} ${salon.channel.name} `);
            createLogs(client, guildId, `Modification config ${nomConfig}`, `${msgCustom}`, '', GREEN)
        } else if (hook) {
            msgCustom = `L'URL du Webhook ${nomConfig} a été modifié !`;
    
            await GuildConfig.updateOne(
                { guildId: guildId },
                { $set: { ["webhook." + nomConfig] : hook } }
            );

            logger.warn(`${user.tag} a effectué la commande admin : /salon ${nomConfig} ${hook} `);
            createLogs(client, guildId, `Modification config ${nomConfig}`, `${msgCustom}`, '', GREEN)
        }

        const embed = new EmbedBuilder()
            .setColor(GREEN)
            .setDescription(`${msgCustom}`);
            
            // TODO : APPELER EVENT CUSTOM POUR ENVOYER LOG
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
}