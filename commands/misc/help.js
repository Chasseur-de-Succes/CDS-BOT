const { MessageEmbed } = require('discord.js');
const { DARK_RED, VERY_PALE_BLUE, CORNFLOWER_BLUE} = require('../../data/colors.json');
//const { PREFIX } = require('../../config.js');
const { readdirSync } = require('fs');
const { MESSAGES } = require('../../util/constants');
const categoryList = readdirSync('./commands');

module.exports.run = (client, message, args) => {
    const PREFIX = process.env.PREFIX;
    if (!args[0]) {
        let embed = new MessageEmbed()
        .setColor(CORNFLOWER_BLUE)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL()})
        .setTimestamp()
        .setDescription(`Voici la liste des commandes disponibles :\nPréfixe: \`${PREFIX}\`\n:books: _Faites \`${PREFIX}info\` pour en apprendre plus sur moi._`)
        .setFooter({ text: 'Demandé par ' + message.author.username});
        //.addField(':pencil2: Commandes:', `${PREFIX}help [command]\n${PREFIX}info`)
        //.addField(':gear: Utilitaires (???)', `${PREFIX}uptime\n${PREFIX}ping`)

        for(const category of categoryList) {
            let categoryRename = "";
            switch(category) {
                case 'misc' :
                    categoryRename = ':pencil2: Misc';
                    break;
                case 'moderation' :
                    categoryRename = '<:warning2:879843712073621515> Modération';
                    break;
                case 'economy' :
                    categoryRename = ':moneybag: Économie';
                    break;
                case 'cds' :
                    categoryRename = ':trophy: CDS';
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
        return message.channel.send({embeds: [embed]});
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
                aliases = `${command.help.aliases}`;
            }

            if(command.help.usage) {
                usage = `${PREFIX}${command.help.name} ${command.help.usage}`
            } 
            else {
                usage = "Pas d'aide d'utilisation"
            }

            //if() check si moderator ou owner
            
            let embedCommand = new MessageEmbed()
            .setColor(VERY_PALE_BLUE)
            .setDescription(`**Commande: \`${command.help.name}\`**`)
            .addField('**Description**', `${command.help.description || "Pas de description"}`)
            .addField('**Utilisation**', usage)
            .addField('**Aliases**', aliases)
            .setFooter({ text: 'Demandé par ' + message.author.username});

            return message.channel.send({embeds: [embedCommand]});
        } else {
            let errorEmbed = new MessageEmbed()
            .setColor(DARK_RED)
            .setTitle(`:x: **Cette commande n'existe pas !**`);

            return message.channel.send({embeds: [errorEmbed]});
        }
        
    }

    
}

module.exports.help = MESSAGES.COMMANDS.MISC.HELP;