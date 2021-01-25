const Discord = require('discord.js');
const colors = require('../data/colors.json');
//const helpMsgs = require('../data/helpMsgs.json');
const config = require('../config.json');
const prefix = config.PREFIX;

module.exports.run = async (client, message, args) => {
    if(args[0]) {
        let command = args[0];
        if(client.commands.has(command)) {
            command = client.commands.get(command);
            if(command.config.aliases == ""){
                var aliases ="Pas d'aliases";
            } else {
                var aliases = command.config.aliases;
            }

            //if() check si moderator ou owner
            
            let HCEmbed = new Discord.MessageEmbed()
            .setColor(colors.very_pale_blue)
            .setDescription(`**Commande: ${command.config.name}** - *Prefix:*  \`${prefix}\``)
            .addField('**Description**', `${command.config.description || "Pas de description"}`)
            .addField('**Utilisation**', `${prefix}${command.config.usage || "Pas d'aide d'utilisation"}`)
            .addField('**Aliases**', `${aliases}`)
            .setFooter('Demandé par ' + message.author.username);

            return message.channel.send(HCEmbed);
        } else {
            let errorEmbed = new Discord.MessageEmbed()
            .setColor(colors.dark_red)
            .setTitle(`:x: **Cette commande n'existe pas !**`);

            return message.channel.send(errorEmbed);
        }
        
    }

    if(!args[0]) {
        message.delete();

        let command = args[0];
        if(client.commands.has(command));
        var HEmbed = new Discord.MessageEmbed()
        .setColor(colors.cornflower_blue)
        .setAuthor(client.user.username, client.user.displayAvatarURL())
        .setTimestamp()
        .setDescription(`Voici la liste des commandes disponibles :\nPrefix: \`${prefix}\`\n:books: _Faites \`${prefix}info\` pour en apprendre plus sur moi._`)
        .addField('Commandes:', "help [command]")
        .setFooter('Demandé par ' + message.author.username);
        //.addField('General commands', helpMsgs.general)
        //.addField('Images commands', helpMsgs.images)

        return message.channel.send(HEmbed);
    }
}

module.exports.config = {
    name: "help",
    aliases: ["h"],
    description: "Affiche toutes les commandes disponibles pour votre niveau de permission.",
    usage: 'help [command]'
}