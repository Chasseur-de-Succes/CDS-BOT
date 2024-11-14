const { Collection, Events } = require("discord.js");
const { User } = require("../models/index.js");
const {
    BAREME_XP,
    BAREME_MONEY,
    SALON,
    DAILY_MONEY_LIMIT,
} = require("../util/constants");
const { addXp } = require("../util/xp.js");
const { getAchievement } = require("../util/msg/stats");
const { feedBotMetaAch } = require("../util/envoiMsg");

module.exports = {
    name: Events.MessageCreate,
    async execute(msg) {
        /* Pour stat nb msg envoyé (sans compter bot, commande avec prefix et /) */
        /* et money par jour */
        if (!msg.author.bot) {
            const timeLeft = cooldownTimeLeft("messages", 30, msg.author.id);
            if (!timeLeft) {
                const userDB = await msg.client.getUser(msg.author);

                if (userDB) {
                    // stat ++
                    userDB.stats.msg++;

                    // test si achievement unlock
                    const achievementUnlock = await getAchievement(
                        userDB,
                        "nbMsg",
                    );
                    if (achievementUnlock) {
                        feedBotMetaAch(
                            msg.client,
                            msg.guildId,
                            msg.author,
                            achievementUnlock,
                        );
                    }
                    await userDB.save();

                    await addXp(
                        msg.client,
                        msg.guildId,
                        msg.author,
                        BAREME_XP.MSG,
                    );

                    await addMoney(msg.client, msg.author, BAREME_MONEY.MSG);
                }
            }

            const idHeros = await msg.client.getGuildChannel(
                msg.guildId,
                SALON.HALL_HEROS,
            );
            const idZeros = await msg.client.getGuildChannel(
                msg.guildId,
                SALON.HALL_ZEROS,
            );

            const isHallHeros = msg.channelId === idHeros;
            const isHallZeros = msg.channelId === idZeros;

            const hasPJ = msg.attachments.size > 0;
            // nb img dans hall héros
            // si piece jointes
            if (hasPJ) {
                // si image
                if (
                    msg.attachments.every((m) =>
                        m.contentType?.startsWith("image"),
                    )
                ) {
                    // si hall heros
                    if (isHallHeros) {
                        // reactions auto
                        await msg.react("🏆");
                        await msg.react("💯");

                        const userDB = await msg.client.getUser(msg.author);
                        if (userDB) {
                            // stat ++
                            userDB.stats.img.heros++;
                            // test si achievement unlock
                            const achievementUnlock = await getAchievement(
                                userDB,
                                "heros",
                            );
                            if (achievementUnlock) {
                                feedBotMetaAch(
                                    msg.client,
                                    msg.guildId,
                                    msg.author,
                                    achievementUnlock,
                                );
                            }
                            await userDB.save();

                            // save msg dans base
                            const initReactions = new Map([
                                ["🏆", 0],
                                ["💯", 0],
                            ]);
                            await msg.client.createMsgHallHeros({
                                author: userDB,
                                msgId: msg.id,
                                guildId: msg.guildId,
                                reactions: initReactions,
                            });
                        }
                    }

                    // si hall zeros
                    if (isHallZeros) {
                        // reaction auto
                        await msg.react("💩");

                        const userDB = await msg.client.getUser(msg.author);
                        if (userDB) {
                            // stat ++
                            userDB.stats.img.zeros++;
                            // test si achievement unlock
                            const achievementUnlock = await getAchievement(
                                userDB,
                                "zeros",
                            );
                            if (achievementUnlock) {
                                feedBotMetaAch(
                                    msg.client,
                                    msg.guildId,
                                    msg.author,
                                    achievementUnlock,
                                );
                            }
                            await userDB.save();

                            // save msg dans base
                            const initReactions = new Map([["💩", 0]]);
                            await msg.client.createMsgHallZeros({
                                author: userDB,
                                msgId: msg.id,
                                guildId: msg.guildId,
                                reactions: initReactions,
                            });
                        }
                    }
                }
            }
        }
    },
};

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
            return (expirationTime - now) / 1000;
        }
    }

    timestamps.set(userID, now);
    setTimeout(() => timestamps.delete(userID), cooldownAmount);
    return 0;
};

const addMoney = async (client, user, money) => {
    const userDB = await client.getUser(user);

    // limite les points gagnés par DAILY_MONEY_LIMIT
    if (userDB?.moneyLimit < DAILY_MONEY_LIMIT) {
        // si pas register pas grave, ca ne passera pas
        // incrémente les points gagnés aujourd'hui (limite) et la cagnotte
        await User.updateOne(
            { userId: user.id },
            { $inc: { moneyLimit: money } },
        );
        await User.updateOne({ userId: user.id }, { $inc: { money: money } });
    }
};
