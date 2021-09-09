const { MessageEmbed } = require("discord.js");
const { PREFIX, MONEY } = require("../../config");
const {very_pale_blue, dark_red, crimson} = require('../../data/colors.json');
const { cross_mark } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants.js');

module.exports.run = async (client, message, args) => {
    try {
        let member;
        let dbUser;
        if(!args[0]) {
            member = message.member;

            dbUser = await client.getUser(member);
            if(!dbUser) throw `Tu n'as pas encore de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``; // Si pas dans la BDD
        }
        else if(message.mentions.users.first()) {
            const user = message.mentions.users.first();
            member = message.guild.members.cache.get(user.id);

            dbUser = await client.getUser(member);
            if(!dbUser) throw `${member.user.tag} n'a pas encore de compte !`; // Si pas dans la BDD
        } else {
            const userId = args[0];
            member = message.guild.members.cache.get(userId);
            if(!member) throw `Aucune personne n'a été trouvé avec l'id : ${member}`;
            
            dbUser = await client.getUser(member);
            if(!dbUser) throw `${member.user.tag} n'a pas encore de compte !`; // Si pas dans la BDD
        }

        //console.log(dbUser);
        const msg = `> **Profil** de ${member.user.tag}`;
        const colorEmbed = (dbUser.banned || dbUser.blacklisted) ? crimson : very_pale_blue; //si banni ou blacklisté -> couleur en rouge
        const banned = dbUser.banned ? "[banni]" : "";
        const blacklisted = dbUser.blacklisted ? "[blacklisté]" : "";
        const embed = new MessageEmbed()
            .setColor(colorEmbed)
            .setTitle(`${member.user.username} ${banned}${blacklisted}`)
            .addFields(
                {name: "Money", value: `${dbUser.money} ${MONEY}`},
            );
        message.channel.send({content: msg, embeds: [embed]});

    } catch (err) {
        const embedError = new MessageEmbed()
            .setColor(dark_red)
            .setDescription(`${cross_mark} • ${err}`);
        return message.channel.send({embeds: [embedError]});
    }
}

module.exports.help = MESSAGES.COMMANDS.MISC.PROFILE;