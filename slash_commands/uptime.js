const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { CORNFLOWER_BLUE} = require('../data/colors.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDMPermission(false)
        .setDescription('Depuis quand le bot est up ?'),
    async execute(interaction) {
        const client = interaction.client;

        let date = new Date();
        // on soustrait à la date du jour les millisecondes depuis le uptime du client
        date.setMilliseconds(date.getMilliseconds() - client.uptime);
        
        const embed = new EmbedBuilder()
            .setColor(CORNFLOWER_BLUE)
            .setTitle('Uptime')
            // <t:TIMESTAMP:R> => il y a XXX seconde, minute etc
            // /1000 car getTime() retourne les milliseconds, et pas besoin
            .setDescription(`<t:${Math.floor(date.getTime()/1000)}:R>`);

        await interaction.reply({ embeds: [embed] });
    },
}