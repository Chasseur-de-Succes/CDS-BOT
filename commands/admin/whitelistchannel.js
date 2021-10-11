const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { PREFIX } = require("../../config");
const { check_mark, cross_mark } = require('../../data/emojis.json');
const { dark_red, night, green } = require("../../data/colors.json");

module.exports.run = async (client, message, args) => {
    if(!message.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) return error(`${cross_mark} Vous n'avez pas la permission requise !`);

    if(!args) return error(`${cross_mark} Merci de préciser un argument : \`${PREFIX}whitelistchannel <add | remove | list> [<mention mention>]\``);
    
    const guildId = message.guildId;
    const dbGuild = await client.findGuildById(guildId);
    let embed;
    let whitelistList = "";

    if(args[0] == "list") {
        let whitelist = dbGuild.whitelistChannel;
        if(whitelist.length != 0) {
            whitelist.forEach(channel => {
                whitelistList += `<#${channel}>\n`;
            });
        } else {
            whitelistList = "Aucun channel dans la whitelist ! Les commandes sont donc acceptées dans tous les channels.";
        }
        embed = new MessageEmbed()
            .setColor(night)
            .setTitle("Liste des channels whitelisté")
            .setDescription(whitelistList);
        
    } else if(args[0] == "add") {
        if(!message.mentions.channels.first()) return error(`${cross_mark} Merci de mentionner un channel : \`${PREFIX}whitelistchannel add <mention channel>\``);
            let whitelist = message.mentions.channels.first();
            await client.update(dbGuild, { "$addToSet": {whitelistChannel: whitelist } });
            embed = new MessageEmbed()
                .setColor(green)
                .setDescription(`Le channel : ${whitelist} a été ajouté à la whitelist par ${message.author}`);

    } else if(args[0] == "remove") {
        if(!message.mentions.channels.first()) return error(`${cross_mark} Merci de mentionner un channel : \`${PREFIX}whitelistchannel remove <mention channel>\``);
            let whitelist = message.mentions.channels.first();
            
            await client.update(dbGuild, { "$pull": {whitelistChannel: whitelist } });
            embed = new MessageEmbed()
                .setColor(green)
                .setDescription(`Le channel : ${whitelist} a été supprimé à la whitelist par ${message.author}`);

    } else {
        if(!args[1]) return error(`${cross_mark} Mauvaise utilisation de la commande ! Utilisation attendue : \`${PREFIX}whitelistchannel <add | remove | list> [<mention channel>]\``);
    }

    console.log(`\x1b[31m[WARN] \x1b[0m ${message.author.tag} a effectué la commande admin : ${MESSAGES.COMMANDS.ADMIN.WHITELISTCHANNEL.name}`);
    message.channel.send({embeds: [embed]});

    function error(err) {
        const embedError = new MessageEmbed()
            .setColor(dark_red)
            .setTitle(`${err}`);
    
        return message.channel.send({embeds: [embedError]});
    }
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.WHITELISTCHANNEL;