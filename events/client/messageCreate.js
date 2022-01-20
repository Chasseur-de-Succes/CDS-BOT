const {PREFIX} = require('../../config.js');
const { CROSS_MARK } = require('../../data/emojis.json');

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
    if (whitelistList.length != 0) {
        const category = command.help.category;
        if (!(category == 'admin' || category == 'moderation')) {
            const guildConf = await client.findGuildConfig({ whitelistChannel: msg.channelId });
            if(guildConf.length === 0) {
                return msg.react(CROSS_MARK);
            }
        }
    }

    command.run(client, msg, args);
}