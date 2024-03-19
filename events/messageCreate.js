const { Collection, EmbedBuilder, Events, WebhookClient } = require('discord.js');
const { CROSS_MARK } = require('../data/emojis.json');
const { User, Game } = require('../models/index.js');
const { BAREME_XP, BAREME_MONEY, SALON, crtHour } = require("../util/constants");
const { addXp } = require('../util/xp.js');
const { getAchievement } = require('../util/msg/stats');
const { feedBotMetaAch } = require('../util/envoiMsg');

const SteamUser = require('steam-user');
const FS = require('fs');
const { retryAfter5min } = require('../util/util');

module.exports = {
	name: Events.MessageCreate,
	async execute(msg) {
        /* Pour stat nb msg envoyé (sans compter bot, commande avec prefix et /) */
        /* et money par jour */
        if (!msg.author.bot) {
            const timeLeft = cooldownTimeLeft('messages', 30, msg.author.id);
            if (!timeLeft) {
                const userDB = await msg.client.getUser(msg.author);

                if (userDB) {
                    // stat ++
                    userDB.stats.msg++;

                    // test si achievement unlock
                    const achievementUnlock = await getAchievement(userDB, 'nbMsg');
                    if (achievementUnlock) {
                        feedBotMetaAch(msg.client, msg.guildId, msg.author, achievementUnlock);
                    }
                    await userDB.save();

                    await addXp(msg.client, msg.guildId, msg.author, BAREME_XP.MSG);
    
                    await addMoney(msg.client, msg.author, BAREME_MONEY.MSG);
                }
            }

            const idHeros = await msg.client.getGuildChannel(msg.guildId, SALON.HALL_HEROS);
            const idZeros = await msg.client.getGuildChannel(msg.guildId, SALON.HALL_ZEROS);

            const isHallHeros = msg.channelId === idHeros;
            const isHallZeros = msg.channelId === idZeros;

            const hasPJ = msg.attachments.size > 0;
            // nb img dans hall héros
            // si piece jointes
            if (hasPJ) {
                // si image
                if (msg.attachments.every(m => m.contentType?.startsWith('image'))) {
                    // si hall heros
                    if (isHallHeros) {
                        // reactions auto
                        await msg.react('🏆');
                        await msg.react('💯');

                        const userDB = await msg.client.getUser(msg.author);
                        if (userDB) {
                            // stat ++
                            userDB.stats.img.heros++;
                            // test si achievement unlock
                            const achievementUnlock = await getAchievement(userDB, 'heros');
                            if (achievementUnlock) {
                                feedBotMetaAch(msg.client, msg.guildId, msg.author, achievementUnlock);
                            }
                            await userDB.save();
        
                            // save msg dans base
                            const initReactions = new Map([['🏆', 0], ['💯', 0]])
                            await msg.client.createMsgHallHeros({
                                author: userDB,
                                msgId: msg.id,
                                guildId: msg.guildId,
                                reactions: initReactions
                            });
                        }
                    }
                        
                    // si hall zeros
                    if (isHallZeros) {
                        // reaction auto
                        await msg.react('💩');

                        const userDB = await msg.client.getUser(msg.author);
                        if (userDB) {
                            // stat ++
                            userDB.stats.img.zeros++;
                            // test si achievement unlock
                            const achievementUnlock = await getAchievement(userDB, 'zeros');
                            if (achievementUnlock) {
                                feedBotMetaAch(msg.client, msg.guildId, msg.author, achievementUnlock);
                            }
                            await userDB.save();

                            // save msg dans base
                            const initReactions = new Map([['💩', 0]]);
                            await msg.client.createMsgHallZeros({
                                author: userDB,
                                msgId: msg.id,
                                guildId: msg.guildId,
                                reactions: initReactions
                            });
                        }
                    }
                }
            }

            // TODO auto replies sur certains mots/phrase ?

            // stop
            return;
        }
    }
};

const recupIcon = async (steamClient, appid, game) => {
    // Passing true as the third argument automatically requests access tokens, which are required for some apps
    let result = await steamClient.getProductInfo([parseInt(appid)], [], true); 
    if (result.apps[parseInt(appid)].appinfo?.common?.clienticon)
        game.iconHash = result.apps[parseInt(appid)].appinfo.common.clienticon;
    else 
        game.iconHash = result.apps[parseInt(appid)].appinfo.common.icon;
    
    await game.save();
}

const recupAchievements = async (client, appid, game) => {
    // - recup achievements (si présent)
    const resp = await client.getSchemaForGame(appid);
    // si jeu a des succès
    if (resp.availableGameStats?.achievements) {
        console.log(`   * a des succès !`);
        const achievements = resp.availableGameStats.achievements;
        
        // - ajout & save succes dans Game
        achievements.forEach(el => {
            el['apiName'] = el['name'];
            delete el.name;
            delete el.defaultvalue;
            delete el.hidden;
        });

        game.achievements = achievements;
        
        await game.save();
    } else {
        // - save tableau vide
        // console.log('pas de succes');
        game.achievements = [];
        await game.save();
    }
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

const addMoney = async (client, user, money) => {
    const userDB = await client.getUser(user);

    // limit argent gagné par 50 TODO constant ?
    if (userDB?.moneyLimit < 50) {
        // si pas register pas grave, ca ne passera pas
        await User.updateOne(
            { userId: user.id },
            { $inc: { moneyLimit : money } }
        );
        await User.updateOne(
            { userId: user.id },
            { $inc: { money : money } }
        );
    }
}
