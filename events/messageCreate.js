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
        const PREFIX = process.env.PREFIX;
        // A Corriger : uniquement si début du message
        // if (msg.mentions.has(client.user.id)) {
        //     return msg.reply(`Tu as besoin d'aide ? Mon préfixe est \`${PREFIX}\``);
        // }

        /* Pour stat nb msg envoyé (sans compter bot, commande avec prefix et /) */
        /* et money par jour */
        if (!msg.author.bot && !msg.content.startsWith(PREFIX)) {
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
        } else {
            if (msg.content.startsWith(PREFIX)) {
                // fresh all games
                const args = msg.content.slice(PREFIX.length).split(/ +/);
                const commandName = args.shift().toLowerCase();

                // console.log('unset...');
                // await Game.updateMany({}, {$unset: {iconHash:1}});
                // console.log('unset ok');

                // by Kekwel && !refresh <appid>
                if (msg.author.id === '283681024360054785' && commandName === "refresh") {
                    let steamClient = new SteamUser();
                    steamClient.logOn({anonymous: true}); // Log onto Steam anonymously

                    // TODO mettre autre part car rajotue un listener..
                    steamClient.on('loggedOn', async (details) => {
                        const appid = args[0];
    
                        if (appid) {
                            // si ALL
                            if (appid === "all") {
                                try {   
                                    await msg.client.fetchAllApps();
                                } catch (err) {
                                    console.log('mais euuuuuh :(', err.status);
                                }
                            } else if (appid === 'icons') {
                                let msgProgress = await msg.channel.send(`Ok c'est parti ! Cela peut prendre du temps..
                                Récupération de tous les jeux..`);
                                await msg.react('⌛');

                                try {
                                    // - recup TOUS les JEUX (type: 'game' ou 'demo') 
                                    let games = await Game.find({ 
                                        $and: [
                                            { $or: [ {type: 'game'}, {type: 'demo'} ] },
                                            { iconHash: {$exists: false} }
                                        ]
                                    }).limit(10000);
        
                                    await msgProgress.edit(`${games.length} à traiter...`);
            
                                    let crtIdx = 1
                                    // - pour chaque jeu, faire la même chose que plus haut
                                    for (let i = 0; i < games.length; i++) {
                                        //games.forEach(async game => {
                                        const game = games[i];
                                        if (crtIdx % 100 === 0) {
                                            logger.info(`[${crtHour()}] - ${crtIdx}/${games.length} ..`);
                                            await msgProgress.edit(`[${crtIdx}/${games.length}] - Traitement des jeux ${".".repeat(((crtIdx/100) % 3) + 1)}`);
                                        }
        
                                        console.log(` * fetch ${game.appid} ${game.name}`);
        
                                        try {
                                            await retryAfter5min(async function() {
                                                // recup icon
                                                await recupIcon(steamClient, game.appid, game);
                                            })
                                        } catch (err) {
                                            console.log('mais euh :(', err.status);
                                        }
                                        
                                        crtIdx++;
                                    };
                                } catch (err) {
                                    msgProgress.delete();
                                    msg.react(CROSS_MARK);
                                    logger.error("Erreur fetch icons : " + err);
                                    console.log(err);
        
                                    console.log("Logging off of Steam");
                                    steamClient.logOff();
                                }
                            } else {
                                // - recup GameDB avec appid
                                let game = await Game.findOne({ appid: appid });
                                
                                if (game) {
                                    try {
                                        // recup icon
                                        await recupIcon(steamClient, appid, game);
            
                                        // recup succes
                                        await recupAchievements(msg.client, appid, game);
                                    } catch (err) {
                                        console.log('mais euh :(', err.status);
                                    }
                                } else {
                                    // TODO faire qqchose si game pas dans bdd ?
                                }
                            }
                        } else {
                            let msgProgress = await msg.channel.send(`Ok c'est parti ! Cela peut prendre du temps..
                                Récupération de tous les jeux..`);
    
                            try {
                                // - recup TOUS les JEUX (type: 'game' ou 'demo') avec hasAchievements, et achievements non existant
                                let games = await Game.find({ 
                                    $and: [
                                        { $or: [ {type: 'game'}, {type: 'demo'} ] },
                                        { hasAchievements: true },
                                        { achievements: {$exists: false} }
                                    ]
                                }).sort('appid');
    
                                await msgProgress.edit(`${games.length} à traiter...`);
        
                                let crtIdx = 1
                                // - pour chaque jeu, faire la même chose que plus haut
                                for (let i = 0; i < games.length; i++) {
                                    //games.forEach(async game => {
                                    const game = games[i];
                                    if (crtIdx % 100 === 0) {
                                        logger.info(`[${crtHour()}] - ${crtIdx}/${games.length} ..`);
                                        await msgProgress.edit(`[${crtIdx}/${games.length}] - Traitement des jeux ${".".repeat(((crtIdx/100) % 3) + 1)}`);
                                    }
    
                                    console.log(` * fetch ${game.appid} ${game.name}`);
    
                                    try {
                                        await retryAfter5min(async function() {
                                            // recup icon
                                            await recupIcon(steamClient, game.appid, game);
    
                                            await recupAchievements(msg.client, game.appid, game);
                                        })
                                    } catch (err) {
                                        console.log('nope ' + game.name);
                        
                                        if (err.status === 429) {
                                            logger.info("\x1b[34m[INFO]\x1b[0m ["+crtHour()+"] - "+err+", on attend 5 min ..");
                        
                                            await msgProgress.edit(`${crtIdx}/${games.length} - Trop de requêtes vers l'API Steam ! On attends 5 min ⏳`);
                        
                                            // att 5 min
                                            await delay(300000);
                        
                                            // on re essaie 
                                            try {
                                                await recupAchievements(msg.client, appid, game);
                                            } catch (error) {
                                                logger.error(`Ca veut pas, on peut rien faire pour ${game.name}...`);
                                            }
                                        }
                                    }
                                    
                                    crtIdx++;
                                };
                            } catch (err) {
                                msgProgress.delete();
                                msg.react(CROSS_MARK);
                                logger.error("Erreur fetch achievements : " + err);
                                console.log(err);
    
                                console.log("Logging off of Steam");
                                steamClient.logOff();
                            }
                        }

                        console.log("Logging off of Steam");
                        steamClient.logOff();
                    })
                }
            }
        }

        // TODO ?
        // if (!msg.content.startsWith(PREFIX) || msg.author.bot || msg.channel.type === "dm") return;

        // const args = msg.content.slice(PREFIX.length).split(/ +/);
        // const commandName = args.shift().toLowerCase();

        // const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.help.aliases && cmd.help.aliases.includes(commandName));

        // // Vérification du channel
        // const dbGuild = await client.findGuildById(msg.guildId);
        // const whitelistList = dbGuild.whitelistChannel;
        // if (whitelistList.length != 0 && command) {
        //     const category = command.help.category;
        //     if (!(category == 'admin' || category == 'moderation')) {
        //         const guildConf = await client.findGuildConfig({ whitelistChannel: msg.channelId });
        //         if(guildConf.length === 0) {
        //             return msg.react(CROSS_MARK);
        //         }
        //     }
        // }

        // try {
        //     await command?.run(client, msg, args).catch(e => {
        //         throw(e);
        //     });
        // } catch (error) {
        //     logger.error(`Erreur lors exécution cmd '${commandName}' : ${error.stack}`);
        //     msg.channel.send('Une erreur est survenue lors de l\'exécution de la commande !');
        // }
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
