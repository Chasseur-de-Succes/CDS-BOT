const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { CHANNEL } = require("../util/constants");
const { GREEN } = require("../data/colors.json");
const { createLogs } = require('../util/envoiMsg');
const { GuildConfig } = require('../models');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('salon')
        .setDescription('Pour configurer les salons')
        .addStringOption(option =>
            option
                .setName('nom')
                .setDescription(`Nom du paramètre`)
                .setRequired(true)
                .setAutocomplete(true))
        .addChannelOption(option =>
            option
                .setName('salon')
                .setDescription("Nom du channel correspondant au paramètre")
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction) {
        // cmd config, autocomplete sur nom param
        const focusedValue = interaction.options.getFocused(true);

        let filtered = [];
        if (focusedValue.name === 'nom')
            filtered = CHANNEL
        
        await interaction.respond(filtered);
    },
    async execute(interaction) {
        const nomConfig = interaction.options.get('nom')?.value;
        const salon = interaction.options.get('salon');

        const guildId = interaction.guildId;
        const client = interaction.client;
        let user = interaction.user;

        const msgCustom = `${salon.channel} est maintenant considéré comme '${nomConfig}'`;

        await GuildConfig.updateOne(
            { guildId: guildId },
            { $set: { ["channels." + nomConfig] : salon.value } }
        );
        // await client.update(guildDB, { channels: val });
        logger.warn(`${user.tag} a effectué la commande admin : /salon ${nomConfig} ${salon.channel.name} `);
        createLogs(client, guildId, `Modification config ${nomConfig}`, `${msgCustom}`, '', GREEN)

        const embed = new EmbedBuilder()
            .setColor(GREEN)
            .setDescription(`${msgCustom}`);
            
            // TODO : APPELER EVENT CUSTOM POUR ENVOYER LOG
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
}