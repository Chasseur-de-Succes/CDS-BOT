const { MESSAGES } = require("../../util/constants");
const { CORNFLOWER_BLUE, DARK_RED, GREEN } = require('../../data/colors.json');
const { CHECK_MARK, CROSS_MARK } = require("../../data/emojis.json");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

module.exports.run = async (interaction) => {
    const page = interaction.options.get('page') || 1;

    let rows = [];
    let row = new MessageActionRow();
    row.addComponents(
        new MessageButton()
            .setCustomId("previous")
            .setLabel('Précédent')
            .setEmoji("⏮️")
            .setStyle('SECONDARY'),
        new MessageButton()
            .setCustomId("next")
            .setLabel('Suivant')
            .setEmoji("⏭️")
            .setStyle('SECONDARY')
    );
    rows.unshift(row);

    const embed = new MessageEmbed()
        .setTitle('LEADERBOARD')
        .setColor(CORNFLOWER_BLUE);
    
    await interaction.reply({ embeds: [embed], components: rows });

    const previousFilter = (i) => i.customId === `previous` && i.user.id === interaction.user.id;
    const nextFilter = (i) => i.customId === `next` && i.user.id === interaction.user.id;
    const timer = 30000; // (30 seconds)
    const previous = interaction.channel.createMessageComponentCollector({ filter: previousFilter, time: timer });
    const next = interaction.channel.createMessageComponentCollector({ filter: nextFilter, time: timer });

    previous.on('collect', async i => {
        await i.deferUpdate();
        //await i.editReply({ components: [] });

        const embed = new MessageEmbed()
            .setColor(GREEN)
            .setTitle(`${CHECK_MARK}`);

        previous.stop();
        return interaction.editReply({ embeds: [embed] })
    });

    next.on('collect', async i => {
        await i.deferUpdate();
        //await i.editReply({ components: [] });

        const embed = new MessageEmbed()
            .setColor(DARK_RED)
            .setTitle(`${CROSS_MARK}`);

        return interaction.editReply({ embeds: [embed] })
    });

    // désactiver les boutons si timeout
    previous.on('end', () => {
        row.addComponents(
            new MessageButton()
                .setCustomId("previous")
                .setLabel('Précédent')
                .setEmoji("⏮️")
                .setStyle('SECONDARY')
                .setDisabled(true),
            new MessageButton()
                .setCustomId("next")
                .setLabel('Suivant')
                .setEmoji("⏭️")
                .setStyle('SECONDARY')
                .setDisabled(true)
        );
        rows.unshift(row);

        interaction.editReply({ components: [rows] }).catch(O_o=>{});
    });
}

module.exports.help = MESSAGES.COMMANDS.MISC.LEADERBOARD;