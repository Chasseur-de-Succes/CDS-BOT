const { PREFIX, CHANNEL } = require('../../config.js');
const { CROSS_MARK } = require('../../data/emojis.json');
const { User } = require('../../models/index.js');

module.exports = async (client, msg) => {
    // A Corriger : uniquement si début du message
    // if (msg.mentions.has(client.user.id)) {
    //     return msg.reply(`Tu as besoin d'aide ? Mon préfixe est \`${PREFIX}\``);
    // }

    /* Stat nb msg envoyé (sans compter commande avec prefix et /) */
    if (!msg.author.bot && !msg.content.startsWith(PREFIX)) {
        // si pas register pas grave, ca ne passera pas
        await User.updateOne(
            { userId: msg.author.id },
            { $inc: { "stats.msg" : 1 } }
        );

        const isHallHeros = msg.channelId === CHANNEL.HALL_HEROS;
        const isHallZeros = msg.channelId === CHANNEL.HALL_ZEROS;

        const hasPJ = msg.attachments.size > 0;
        // nb img dans hall héros
        // si piece jointes
        if (hasPJ) {
            // si image
            if (msg.attachments.every(m => m.contentType.startsWith('image'))) {
                // si hall heros
                if (isHallHeros) {
                    // stat ++
                    await User.updateOne(
                        { userId: msg.author.id },
                        { $inc: { "stats.img.heros" : 1 } }
                    );

                    // reactions auto
                    await msg.react('🏆');
                    await msg.react('💯');

                    // save msg dans base
                    const userDB = await client.getUser(msg.author);
                    client.createMsgHallHeros({
                        author: userDB,
                        msgId: msg.id,
                    });
                }
                    
                // si hall zeros
                if (isHallZeros) {
                    // stat ++
                    await User.updateOne(
                        { userId: msg.author.id },
                        { $inc: { "stats.img.zeros" : 1 } }
                    );

                    // reaction auto
                    await msg.react('💩');
                    // save msg dans base
                    const userDB = await client.getUser(msg.author);
                    client.createMsgHallZeros({
                        author: userDB,
                        msgId: msg.id,
                    });
                }
            }
        }
    }

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