const { MessageEmbed } = require('discord.js');
const { VERY_PALE_VIOLET } = require('../../data/colors.json');
const { ONLINE_STATUS, IDLE_STATUS, DND_STATUS, OFFLINE_STATUS } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants');

module.exports.run = async (interaction) => {
    const id = interaction.options.get('user')?.value;
    let member = interaction.member;
    let user = interaction.user;

    if (id) {
        member = await interaction.guild.members.fetch(id).catch(e => {});
        if (!member) {
          const embed = new MessageEmbed().setColor('#e74c3c').setDescription('Invalide ID.');
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        user = member.user;
    }

    const bot = {
        "false": "👤 Humain",
        "true": "🤖 Bot"
    };
    const status = {
        online: `${ONLINE_STATUS} En ligne`,
        idle: `${IDLE_STATUS} Absent`,
        dnd: `${DND_STATUS} Ne pas déranger`,
        offline: `${OFFLINE_STATUS} Hors ligne`
    };
    //const game = user.presence.game ? user.presence.game : 'Rien'; // !!! TODO Not functional
    const nickname = member.nickname != null ? member.nickname : "Aucun";

    const embed = new MessageEmbed()
        .setColor(VERY_PALE_VIOLET)
        .setAuthor(`Informations sur ${user.tag}`, user.displayAvatarURL({dynamic: true, size: 4096, format: 'png'}))
        //.setDescription(`aucune idée de description :eyes:`)
        .setThumbnail(user.displayAvatarURL({dynamic : true, size: 4096, format: 'png'}))
        .addFields(
            {name: `> Pseudonyme`, value: nickname, inline: true},
            {name: `> ID`, value: user.id, inline: true},
            {name: '\u200B', value: '\u200B', inline: true},
            {name: `> Statut`, value: member.presence ? status[member.presence.status] : status['offline'], inline: true},
            //{name: `> Joue à`, value: game, inline: true},
            {name: `> Humain ?`, value: bot[user.bot], inline: true},
            {name: '\u200B', value: '\u200B', inline: true},
            {name: `> Compte créé le`, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:f>`, inline: true},
            {name: `> À rejoint le`, value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true},
        )
        .setTimestamp();

    return interaction.reply({ embeds: [embed] })
}

module.exports.help = MESSAGES.COMMANDS.MISC.USER;