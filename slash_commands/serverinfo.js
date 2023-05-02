const colors = require('../data/colors.json');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDMPermission(false)
        .setDescription('Informations sur le serveur'),
    async execute(interaction) {
        const client = interaction.client;
        const guild = interaction.guild;
        const user = interaction.user;
        const owner = await client.users.fetch(guild.ownerId);

        const embed = new EmbedBuilder()
            .setColor(colors.NIGHT)
            .setTitle(guild.name)
            .setDescription(`ID: ` + guild.id)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Propriétaire du server', value: ` ${owner.username} (ID: ${guild.ownerId})`, inline: false },
                { name: `Membres [${guild.memberCount}]`, value: `${guild.members.cache.filter(m => !m.user.bot).size} humains\n${guild.members.cache.filter(m =>  m.user.bot).size} bots`, inline: true },
                { name: 'Nitro boost ', value: guild.premiumSubscriptionCount.toString(), inline: true },
                { name: 'Serveur créé le', value: `<t:${Math.floor(guild.createdTimestamp/1000)}:f>`, inline: false },
            )
            .setTimestamp(new Date())
            .setFooter({ text: 'Demandé par ' + user.username});

        await interaction.reply({ embeds: [embed] });
    },
}