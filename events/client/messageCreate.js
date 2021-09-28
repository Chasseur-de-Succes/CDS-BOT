const {PREFIX} = require('../../config.js');
const { cross_mark } = require('../../data/emojis.json');

module.exports = (client, msg) => {
    // A Corriger : uniquement si début du message
    // if (msg.mentions.has(client.user.id)) {
    //     return msg.reply(`Tu as besoin d'aide ? Mon préfixe est \`${PREFIX}\``);
    // }

    if(!msg.content.startsWith(PREFIX) || msg.author.bot || msg.channel.type === "dm") return;

    const args = msg.content.slice(PREFIX.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.help.aliases && cmd.help.aliases.includes(commandName));
    if(!command) return;

    // Vérification du channel
    const category = command.help.category;
    // récup whitelist const whitelist;

    if (!(category == 'admin' || category == 'moderation')) {
        if(false) { //check whitelist + si wl est vide autorisé partout
            return msg.react(cross_mark);
        }
    }
    command.run(client, msg, args);
}