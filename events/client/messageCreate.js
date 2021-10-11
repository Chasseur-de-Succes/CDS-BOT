const {PREFIX} = require('../../config.js');
const { cross_mark } = require('../../data/emojis.json');

module.exports = async (client, msg) => {
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
    const dbGuild = await client.findGuildById(msg.guildId);
    const whitelistList = dbGuild.whitelistChannel;
    if(whitelistList.length != 0) {
        const category = command.help.category;
        if (!(category == 'admin' || category == 'moderation')) {
            console.log(await client.findGuildConfig({ whitelistChannel: msg.channelId }).length === 0); // TEMP
            if(await client.findGuildConfig({ whitelistChannel: msg.channelId }).length === 0) {
                return msg.react(cross_mark);
            }
        }
    }

    command.run(client, msg, args);
}