const { MessageEmbed } = require('discord.js');
const { MESSAGES } = require("../../util/constants");
const { GREEN } = require("../../data/colors.json");
const { createLogs } = require('../../util/envoiMsg');
const { GuildConfig } = require('../../models');

module.exports.run = async (interaction) => {
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
    logger.warn(`${user.tag} a effectué la commande admin : /${MESSAGES.COMMANDS.ADMIN.SALON.name} ${nomConfig} ${salon.channel.name} `);
    createLogs(client, guildId, `Modification config ${nomConfig}`, `${msgCustom}`, '', GREEN)

    const embed = new MessageEmbed()
        .setColor(GREEN)
        .setDescription(`${msgCustom}`);
        
        // TODO : APPELER EVENT CUSTOM POUR ENVOYER LOG
    return interaction.reply({ embeds: [embed] });
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.SALON;