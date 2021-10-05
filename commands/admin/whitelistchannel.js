const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { PREFIX } = require("../../config");
const { check_mark, cross_mark } = require('../../data/emojis.json');
const { dark_red, night } = require("../../data/colors.json");

module.exports.run = async (client, message, args) => {
    if(!message.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) return error(`${cross_mark} Vous n'avez pas la permission requise !`);

    if(!args) return error(`${cross_mark} Merci de préciser un argument : \`${PREFIX}whitelistchannel <add | remove | list> [<mention mention>]\``);
    
    const guildId = message.guildId;

    if(args[0] == "list") {
        let configServ = await client.findGuildById(guildId);
        let whitelist = configServ.whitelistChannel || "none";

        const embed = new MessageEmbed()
            .color(night)
            .setTitle("Liste des channels whitlisté")
            .setDescription(whitelist);
        message.channel.send({embeds: [embed]});

    } else if(args[0] == "add") {
        if(!args[1]) return error(`${cross_mark} Merci de mentionner un channel : \`${PREFIX}whitelistchannel <add | remove | list> <mention mention>\``);
            // AJOUT CHANNEL

    } else if(args[0] == "remove") {
            // REMOVE CHANNEL

    } else {
        if(!args[1]) return error(`${cross_mark} Mauvaise utilisation de la commande ! Utilisation attendue : \`${PREFIX}whitelistchannel <add | remove | list> [<mention channel>]\``);
    }

    message.react(check_mark);

    function error(err) {
        const embedError = new MessageEmbed()
            .setColor(dark_red)
            .setTitle(`${err}`);
    
        return message.channel.send({embeds: [embedError]});
    }
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.WHITELISTCHANNEL;