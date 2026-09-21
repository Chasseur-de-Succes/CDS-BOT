const { Collection, Events } = require("discord.js");
const {
    BAREME_XP,
    BAREME_MONEY,
    DAILY_MONEY_LIMIT, NEW_SALON,
} = require("../util/constants");

const { addXp } = require("../util/xp.js");
const { getAchievement } = require("../util/msg/stats");
const { feedBotMetaAch } = require("../util/envoiMsg");
const { UserRepository, StatsRepository, GuildConfigRepository } = require("../repositories");

module.exports = {
    name: Events.MessageCreate,
    async execute(msg) {
        /* Pour stat nb msg envoyé (sans compter bot, commande avec prefix et /) */
        /* et money par jour */
        if (!msg.author.bot) {
            const timeLeft = cooldownTimeLeft("messages", 15, msg.author.id);
            if (!timeLeft) {
                const userDB = await UserRepository.findByDiscordId(msg.author.id);

                if (userDB) {
                    // stat ++
                    await StatsRepository.incrementMsgStat(userDB.id);

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

                    await addXp(
                        msg.client,
                        msg.guildId,
                        msg.author,
                        BAREME_XP.MSG,
                    );

                    await addMoney(msg.author, BAREME_MONEY.MSG);
                }
            }

            const channelHeros = await GuildConfigRepository.getChannel(msg.guildId, NEW_SALON.HALL_HEROS);
            const channelZeros = await GuildConfigRepository.getChannel(msg.guildId, NEW_SALON.HALL_ZEROS);
            const isHallHeros = msg.channelId === channelHeros;
            const isHallZeros = msg.channelId === channelZeros;

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

                        const userDB = await UserRepository.findByDiscordId(msg.author.id);
                        if (userDB) {
                            // stat ++
                            await StatsRepository.incrementHero(userDB.id);
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
                        }
                    }

                    // si hall zeros
                    if (isHallZeros) {
                        // reaction auto
                        await msg.react("💩");

                        const userDB = await UserRepository.findByDiscordId(msg.author.id);
                        if (userDB) {
                            // stat ++
                            await StatsRepository.incrementZero(userDB.id);
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

const addMoney = async (user, money) => {
    const userDB = await UserRepository.findByDiscordUser(user);

    // limite les points gagnés par DAILY_MONEY_LIMIT
    if (userDB?.moneyLimit < DAILY_MONEY_LIMIT) {
        // si pas register pas grave, ca ne passera pas
        // incrémente les points gagnés aujourd'hui (limite) et la cagnotte
        await UserRepository.addMoneyLimit(userDB.id, money);
        await UserRepository.addMoney(userDB.id, money);
    }
};
