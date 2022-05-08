const { Collection } = require('discord.js');
const { PREFIX } = require('../../config.js');
const { CROSS_MARK } = require('../../data/emojis.json');
const { User, MsgHallHeros } = require('../../models/index.js');
const { loadCollectorHall } = require('../../util/msg/stats.js');
const { BAREME_XP, SALON } = require("../../util/constants");
const { addXp } = require('../../util/xp.js');

module.exports = async (client, msg) => {
    // A Corriger : uniquement si début du message
    // if (msg.mentions.has(client.user.id)) {
    //     return msg.reply(`Tu as besoin d'aide ? Mon préfixe est \`${PREFIX}\``);
    // }

    /* Pour stat nb msg envoyé (sans compter bot, commande avec prefix et /) */
    if (!msg.author.bot && !msg.content.startsWith(PREFIX)) {
        const timeLeft = cooldownTimeLeft('messages', 30, msg.author.id);
        if (!timeLeft) {
            // si pas register pas grave, ca ne passera pas
            await User.updateOne(
                { userId: msg.author.id },
                { $inc: { "stats.msg" : 1 } },
            );

            addXp(msg.author, BAREME_XP.MSG);
        }

        const idHeros = await client.getGuildChannel(msg.guildId, SALON.HALL_HEROS);
        const idZeros = await client.getGuildChannel(msg.guildId, SALON.HALL_ZEROS);

        const isHallHeros = msg.channelId === idHeros;
        const isHallZeros = msg.channelId === idZeros;

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
                    const initReactions = new Map([['🏆', 0], ['💯', 0]])
                    const msgHeros = await client.createMsgHallHeros({
                        author: userDB,
                        msgId: msg.id,
                        guildId: msg.guildId,
                        reactions: initReactions
                    });

                    // creer collector
                    loadCollectorHall(msg, msgHeros);
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
                    const initReactions = new Map([['💩', 0]]);
                    const msgZeros = await client.createMsgHallZeros({
                        author: userDB,
                        msgId: msg.id,
                        guildId: msg.guildId,
                        reactions: initReactions
                    });

                    // creer collector
                    loadCollectorHall(msg, msgZeros);
                }
            }
        }

        // TODO auto replies sur certains mots/phrase ?

        // stop
        return;
    }

    if (!msg.content.startsWith(PREFIX) || msg.author.bot || msg.channel.type === "dm") return;

    const args = msg.content.slice(PREFIX.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.help.aliases && cmd.help.aliases.includes(commandName));

    // Vérification du channel
    const dbGuild = await client.findGuildById(msg.guildId);
    const whitelistList = dbGuild.whitelistChannel;
    if (whitelistList.length != 0 && command) {
        const category = command.help.category;
        if (!(category == 'admin' || category == 'moderation')) {
            const guildConf = await client.findGuildConfig({ whitelistChannel: msg.channelId });
            if(guildConf.length === 0) {
                return msg.react(CROSS_MARK);
            }
        }
    }

    command?.run(client, msg, args);
}

const cooldowns = new Collection();

const cooldownTimeLeft = (type, seconds, userID) => {
    // Apply command cooldowns
    if (!cooldowns.has(type)) {
        cooldowns.set(type, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(type);
    const cooldownAmount = (seconds || 3) * 1000;

    if (timestamps.has(userID)) {
        const expirationTime = timestamps.get(userID) + cooldownAmount;

        if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return timeLeft;
        }
    }

    timestamps.set(userID, now);
    setTimeout(() => timestamps.delete(userID), cooldownAmount);
    return 0;
};