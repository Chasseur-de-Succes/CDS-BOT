const Discord = require('discord.js');
const colors = require('../../data/colors.json');
const moment = require('moment');
const { MESSAGES } = require('../../util/constants');

module.exports.run = async (client, message, args) => {
    //let connected = message.guild.members.filter(m => m.presence.status !== 'offline').size; //(embed: [${connected} online])

    const region = {
        "brazil" : "🇧🇷 Brézil",
        "europe" : "🇪🇺 Europe",
        "hong-kong" : "🇭🇰 Hong Kong",
        "india" : "🇮🇳 Inde",
        "japan" : "🇯🇵 Japon",
        "russia" : "🇷🇺 Russie",
        "singapore" : "🇸🇬 Singapour",
        "south-africa" : "🇿🇦 Afrique du Sud",
        "sydney" : "🇦🇺 Australie",
        "us-central" : "🇺🇸 États-Unis (Centre)",
        "us-east" : "🇺🇸 États-Unis (Est)",
        "us-south" : "🇺🇸 États-Unis (Sud)",
        "us-west" : "🇺🇸 États-Unis (Ouest)",
    };

    const owner = await client.users.fetch(message.guild.ownerId);

    const embed = new Discord.MessageEmbed()
    .setColor(colors.NIGHT)
    .setTitle(message.guild.name)
    .setDescription(`ID: ` + message.guildId)
    .setThumbnail(message.guild.iconURL())
    .addFields(
        {name: 'Propriétaire du server', value: ` ${owner.username} (ID: ${message.guild.ownerId})`, inline: false},
        {name: `Membres [${message.guild.memberCount}]`, value: `${message.guild.members.cache.filter(m => !m.user.bot).size} humains\n${message.guild.members.cache.filter(m =>  m.user.bot).size} bots`, inline: true},
        {name: 'Nitro boost ', value: message.guild.premiumSubscriptionCount.toString(), inline: true},
        //{name: 'Région', value: `${region[message.guild.region]}`, inline: true},
        {name: 'Serveur créé le', value: moment.utc(message.guild.createdAt).format("dddd, MMMM Do, YYYY"), inline: false},
    )
    .setTimestamp(new Date())
    .setFooter('Demandé par ' + message.author.username);

    return message.channel.send({embeds: [embed]});
}

module.exports.help = MESSAGES.COMMANDS.MISC.SERVERINFO;