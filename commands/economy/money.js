const { MessageEmbed } = require("discord.js");
const { MESSAGES } = require("../../util/constants");
const { PREFIX, MONEY } = require("../../config");
const { dark_red } = require("../../data/colors.json");
const {cross_mark} = require("../../data/emojis.json");

module.exports.run = async (client, message, args) => {
    let userMoney = 0;
    if(!args[0]) {
        const member = message.member;
        //isDbUser(user);
        
        const dbUser = await client.getUser(member);
        if(dbUser) { //Si il possède un compte
            const userMoney = dbUser.money;
            message.channel.send(`Vous avez ${userMoney}${MONEY}`);
        } else {
            const embedError = new MessageEmbed()
            .setColor(dark_red)
            .setTitle(`${cross_mark} Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``);
            
            return message.channel.send({embeds: [embedError]});
        }
    } 
    else if(message.mentions.users.first()) {
        const user = message.mentions.users.first();
        const member = message.guild.members.cache.get(user.id);

        const dbUser = await client.getUser(member);
        if(dbUser) { //Si il possède un compte
            const userMoney = dbUser.money;
            message.channel.send(`${member.user.tag} possède ${userMoney}${MONEY}`);
        } else {
            const embedError = new MessageEmbed()
            .setColor(dark_red)
            //.setTitle(`${cross_mark} ${member.user.tag} n'a pas de compte !`); // tag
            .setDescription(`${cross_mark} ${member.user} n'a pas de compte !`); // "mention"

            return message.channel.send({embeds: [embedError]});
        }
    } 
    else {
        const userId = args[0];
        let dbUser;
        let member;
        member = message.guild.members.cache.get(userId);
        if(member) { // si trouvé sur le serveur
            dbUser = await client.findUserById(member.id);

            if(dbUser){ //Si il possède un compte
                const userMoney = dbUser.money;
                message.channel.send(`${member.tag} possède ${userMoney}${MONEY}`);
            } else {
                const embedError = new MessageEmbed()
                    .setColor(dark_red)
                    .setDescription(`${cross_mark} ${member.user} n'a pas de compte !`);
        
                return message.channel.send({embeds: [embedError]});
            }
        } else {
            const embedError = new MessageEmbed()
            .setColor(dark_red)
            .setDescription(`${cross_mark} L'utilisateur : ${userId} n'a pas été trouvé ! (Options de recherche pris en charge : mentions ou id)`);

            return message.channel.send({embeds: [embedError]});
        }
    }
}

module.exports.help = MESSAGES.COMMANDS.ECONOMY.MONEY;