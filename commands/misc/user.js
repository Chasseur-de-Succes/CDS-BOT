const { MessageEmbed } = require('discord.js');
const colors = require('../../data/colors.json');

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
        online: "<:online_status:696296082254069810> En ligne",
        idle: "<:idle_status:696296207718416384> Absent",
        dnd: "<:dnd_status:696296103183908914> Ne pas déranger",
        offline: "<:offline_status:696296070459949077> Hors ligne"
    };
    //const game = user.presence.game ? user.presence.game : 'Rien'; // !!! Not functional
    const nickname = member.nickname != null ? member.nickname : "Aucun";

    const embed = new MessageEmbed()
        .setColor(colors.test)
        .setAuthor(`Informations sur ${user.tag}`, user.displayAvatarURL({dynamic: true, size: 4096, format: 'png'}))
        //.setDescription(`aucune idée de description :eyes:`)
        .setThumbnail(user.displayAvatarURL({dynamic : true, size: 4096, format: 'png'}))
        .addFields(
            {name: `> Pseudonyme`, value: nickname, inline: true},
            {name: `> ID`, value: user.id, inline: true},
            {name: '\u200B', value: '\u200B', inline: true},
            {name: `> Statut`, value: status[member.presence.status], inline: true},
            //{name: `> Joue à`, value: game, inline: true},
            {name: `> Humain ?`, value: bot[user.bot], inline: true},
            {name: '\u200B', value: '\u200B', inline: true},
            {name: `> Compte créé le`, value: moment(user.createdAt).format('LLL'), inline: true},
            {name: `> À rejoint le`, value: moment(member.joinedAt).format('llll'), inline: true},
        )
        .setTimestamp();

    return message.channel.send({embeds: [embed]});
}

module.exports.help = MESSAGES.COMMANDS.MISC.USER;