const { MessageEmbed } = require('discord.js');
const { VERY_PALE_VIOLET } = require('../../data/colors.json');

const moment = require('moment');
const { MESSAGES } = require('../../util/constants');
moment.locale('fr');

module.exports.run = (client, message, args) => {
    const user = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(user.id);

    const bot = {
        "false": "👤 Humain",
        "true": "🤖 Bot"
    };
    const status = {
        online: "<:ONLINE_STATUS:879826752392814662> En ligne",
        idle: "<:IDLE_STATUS:879826914452324403> Absent",
        dnd: "<:DND_STATUS:879826688480010241> Ne pas déranger",
        offline: "<:OFFLINE_STATUS:879826734181138514> Hors ligne"
    };
    //const game = user.presence.game ? user.presence.game : 'Rien'; // !!! Not functional
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
            //{name: `> Compte créé le`, value: moment(user.createdAt).format('LLL'), inline: true},
            //{name: `> À rejoint le`, value: moment(member.joinedAt).format('llll'), inline: true},
            {name: `> Compte créé le`, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:f>`, inline: true},
            {name: `> À rejoint le`, value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true},
        )
        .setTimestamp();

    return message.channel.send({embeds: [embed]});
}

module.exports.help = MESSAGES.COMMANDS.MISC.USER;