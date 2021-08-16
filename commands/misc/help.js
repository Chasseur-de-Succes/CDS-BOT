const { MessageEmbed } = require('discord.js');
const colors = require('../../data/colors.json');
const { PREFIX } = require('../../config.js');
const { readdirSync } = require('fs');
const { MESSAGES } = require('../../util/constants');
const categoryList = readdirSync('./commands');

module.exports.run = (client, message, args) => {
    if(!args[0]) {
        let embed = new MessageEmbed()
        .setColor(colors.cornflower_blue)
        .setAuthor(client.user.username, client.user.displayAvatarURL())
        .setTimestamp()
        .setDescription(`Voici la liste des commandes disponibles :\nPréfixe: \`${PREFIX}\`\n:books: _Faites \`${PREFIX}info\` pour en apprendre plus sur moi._`)
        .setFooter('Demandé par ' + message.author.username);
        //.addField(':pencil2: Commandes:', `${PREFIX}help [command]\n${PREFIX}info`)
        //.addField(':gear: Utilitaires (???)', `${PREFIX}uptime\n${PREFIX}ping`)

        for(const category of categoryList) {
            let categoryRename = "";
            switch(category) {
                case 'misc' :
                    categoryRename = ':pencil2: Misc';
                    break;
                case 'moderation' :
                    categoryRename = '<:warning2:706510404356014121> Modération';
                    break;
                case 'economy' :
                    categoryRename = ':moneybag: Économie';
                    break;
                default:
                    categoryRename = category;
            }
            embed.addField(
                `${categoryRename}`,
                `${client.commands.filter(cat => cat.help.category === category.toLowerCase()).map(cmd => cmd.help.name).join(', ')}`
            );
        }

        message.delete();
        return message.channel.send(embed);
    }
    else if(args[0]) {
        let command = args[0];
        if(client.commands.has(command)) { // || client.commands.help.aliases.has(command) Voir si il a utilisé un aliase
            command = client.commands.get(command);
            let aliases, usage;
            if(command.help.aliases == ""){
                aliases = "Pas d'aliases";
            } 
            else {
                aliases = command.help.aliases;
            }

            if(command.help.usage) {
                usage = `${PREFIX}${command.help.name} ${command.help.usage}`
            } 
            else {
                usage = "Pas d'aide d'utilisation"
            }

            //if() check si moderator ou owner
            
            let embedCommand = new MessageEmbed()
            .setColor(colors.very_pale_blue)
            .setDescription(`**Commande: \`${command.help.name}\`**`)
            .addField('**Description**', `${command.help.description || "Pas de description"}`)
            .addField('**Utilisation**', usage)
            .addField('**Aliases**', aliases)
            .setFooter('Demandé par ' + message.author.username);

            return message.channel.send(embedCommand);
        } else {
            let errorEmbed = new MessageEmbed()
            .setColor(colors.dark_red)
            .setTitle(`:x: **Cette commande n'existe pas !**`);

            return message.channel.send(errorEmbed);
        }
        
    }

    
}

module.exports.help = MESSAGES.COMMANDS.MISC.HELP;