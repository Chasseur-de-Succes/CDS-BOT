const { MessageEmbed } = require("discord.js");
const colors = require('../../data/colors.json');
const { check_mark, cross_mark } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants.js');

module.exports.run = async (client, message, args) => {
    const dbUser = await client.getUser(message.member);

    if(!dbUser) {
        await client.createUser({
            userId: message.member.id,
            username: message.member.user.tag,
        });

        const embed = new MessageEmbed()
        .setColor(colors.green)
        .setTitle(`${check_mark} Vous êtes désormais inscrit`)
        message.channel.send({embeds: [embed]});
    } else {
        const embedError = new MessageEmbed()
        .setColor(colors.dark_red)
        .setTitle(`${cross_mark} Erreur : tu es déjà inscrit !`);
        
        return message.channel.send({embeds: [embedError]});
    }
    
}

module.exports.help = MESSAGES.COMMANDS.MISC.REGISTER;