const colors = require('../../data/colors.json');
const moment = require('moment');
const { MESSAGES } = require('../../util/constants');
const { MessageEmbed } = require('discord.js');

module.exports.run = async (interaction) => {
    const client = interaction.client;
    const guild = interaction.guild;
    const user = interaction.user;
    const owner = await client.users.fetch(guild.ownerId);

    const embed = new MessageEmbed()
        .setColor(colors.NIGHT)
        .setTitle(guild.name)
        .setDescription(`ID: ` + guild.id)
        .setThumbnail(guild.iconURL())
        .addFields(
            {name: 'Propriétaire du server', value: ` ${owner.username} (ID: ${guild.ownerId})`, inline: false},
            {name: `Membres [${guild.memberCount}]`, value: `${guild.members.cache.filter(m => !m.user.bot).size} humains\n${guild.members.cache.filter(m =>  m.user.bot).size} bots`, inline: true},
            {name: 'Nitro boost ', value: guild.premiumSubscriptionCount.toString(), inline: true},
            {name: 'Serveur créé le', value: moment.utc(guild.createdAt).format("dddd, MMMM Do, YYYY"), inline: false},
        )
        .setTimestamp(new Date())
        .setFooter('Demandé par ' + user.username);

    return interaction.reply({embeds: [embed]});
}

module.exports.help = MESSAGES.COMMANDS.MISC.SERVERINFO;