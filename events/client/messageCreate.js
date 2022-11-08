const { Collection, MessageEmbed } = require('discord.js');
//const { PREFIX } = require('../../config.js');
const { CROSS_MARK } = require('../../data/emojis.json');
const { User } = require('../../models/index.js');
const { BAREME_XP, BAREME_MONEY, SALON } = require("../../util/constants");
const { addXp } = require('../../util/xp.js');
const advent = require('../../data/advent/calendar.json');
const { YELLOW, NIGHT, GREEN, DARK_RED } = require("../../data/colors.json");

module.exports = async (client, msg) => {
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
            // si pas register pas grave, ca ne passera pas
            await User.updateOne(
                { userId: msg.author.id },
                { $inc: { "stats.msg" : 1 } },
            );

            await addXp(msg.author, BAREME_XP.MSG);

            await addMoney(client, msg.author, BAREME_MONEY.MSG);
        }

        const idAdvent = await client.getGuildChannel(msg.guildId, SALON.ADVENT);
        const idHeros = await client.getGuildChannel(msg.guildId, SALON.HALL_HEROS);
        const idZeros = await client.getGuildChannel(msg.guildId, SALON.HALL_ZEROS);

        const isAdvent = msg.channelId === idAdvent;
        const isHallHeros = msg.channelId === idHeros;
        const isHallZeros = msg.channelId === idZeros;

        // SPECIAL CALENDRIER DE L'AVENT
        if (isAdvent) {
            let userDB = await User.findOne({ userId: msg.author.id });

            let author = msg.author;
            let msgContent = msg.content;
            await msg.delete()
            
            if (userDB) {
                // - récuperer "index" date du jour, changement à 18h
                let index = new Date().getDate();
                
                //if (new Date().getMonth() >= 10)
                //    return;
                //let index = 5;
                // si avant 18h, on est tjs sur jours d'avant 
                if (new Date().getHours() < 18) {
                    index--
                }

                // les 24 premiers jours
                if (index < 25) {
                    let embed = new MessageEmbed()
                        .setTitle(`🌟 Énigme jour ${index} 🌟`);
                    // - si user a déjà répondu à question du jour : on ignore
                    if (userDB.event[2022].advent.answers === undefined || userDB.event[2022].advent.answers.get('' + index) === undefined) {
                        const query = { userId: author.id };
                        var update = { $set : {}, $inc: {} };
                        
                        // on vérifie si le message est l'une des réponses possible
                        const reponseTrouve = advent[index].reponse.some(el => el.toLowerCase() === msgContent.toLowerCase());

                        update.$set["event.2022.advent.answers." + index + ".valid"] = reponseTrouve;
                        update.$set["event.2022.advent.answers." + index + ".date"] = new Date();

                        // - score en fonction de la position de l'user (+ rapide, point++)
                        const matchValid = {}, matchExist = {};
                        const matchAgg = { $match: { $and: [matchValid, matchExist] }};
                        matchValid["event.2022.advent.answers." + index + ".valid"] = true
                        matchExist["event.2022.advent.answers." + index + ".date"] = { '$exists': true }
                        const dejaRep = await User.aggregate([matchAgg, { $limit: 3 }]);

                        let point = 1;
                        let msgBonus = '';
                        if (dejaRep.length === 0) {             // 1er
                            point = 9;
                            msgBonus = 'Tu as répondu le **1er** ! **9 points** pour toi !';
                        } else if (dejaRep.length === 1) {      // 2eme
                            point = 6;
                            msgBonus = 'Tu as répondu le **2ème** ! **6 points** pour toi !';
                        } else if (dejaRep.length === 2) {      // 3eme
                            point = 3;
                            msgBonus = 'Tu as répondu le **3ème** ! **3 points** pour toi !';
                        }
                        
                        update.$inc["event.2022.advent.score"] = reponseTrouve ? point : 0

                        // { $inc: { "stats.msg" : 1 } }
                        userDB = await User.findOneAndUpdate(query, update)

                        // - prevenir user
                        embed.setColor(reponseTrouve ? GREEN : DARK_RED);
                        if (reponseTrouve) {
                            embed.setDescription(`Bravo ! Tu as trouvé la **bonne réponse** à l'énigme !
                                ${msgBonus}
                                Il faut attendre demain 18h pour la prochaine énigme 🕵️`)
                        } else {
                            embed.setDescription(`Oh non ! C'est une **mauvaise réponse** :( et il n'y a qu'un seul essai !
                                Il faut attendre demain 18h pour la prochaine énigme 🕵️`)
                        }
                    } else {
                        // - prevenir user
                        embed.setDescription(`Hey, tu as **déjà répondu** à cette énigme ! Il n'y a qu'un seul essai !
                            Il faut attendre demain 18h pour la prochaine énigme 🕵️`)
                    }
    
                    // on refresh l'userdb
                    userDB = await User.findOne({ userId: author.id });
    
                    // nb enigme repondu
                    const nbEnigme = userDB.event[2022].advent.answers ? userDB.event[2022].advent.answers.size : 1;
                    let nbEnigmeSolved = 0;
                    for (let value of userDB.event[2022].advent.answers.values()) {
                        if (value?.valid) nbEnigmeSolved++
                    }
                    // nb total = index courant
                    const nbEnigmeTotal = index;
    
                    embed.setFooter({ text: `BONNES RÉPONSES ✅${nbEnigmeSolved}/${nbEnigmeTotal} | TOTAL 🗒️${nbEnigme}/${nbEnigmeTotal}` });
    
                    // - send embed MP
                    await author.send({ embeds: [embed] });
                }
                
            } else {
                // TODO pas register
            }
        } else {
            const hasPJ = msg.attachments.size > 0;
            // nb img dans hall héros
            // si piece jointes
            if (hasPJ) {
                // si image
                if (msg.attachments.every(m => m.contentType?.startsWith('image'))) {
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
                        if (userDB) {
                            const initReactions = new Map([['🏆', 0], ['💯', 0]])
                            await client.createMsgHallHeros({
                                author: userDB,
                                msgId: msg.id,
                                guildId: msg.guildId,
                                reactions: initReactions
                            });
                        }
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
                        if (userDB) {
                            const initReactions = new Map([['💩', 0]]);
                            await client.createMsgHallZeros({
                                author: userDB,
                                msgId: msg.id,
                                guildId: msg.guildId,
                                reactions: initReactions
                            });
                        }
                    }
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

    try {
        await command?.run(client, msg, args).catch(e => {
            throw(e);
        });
    } catch (error) {
        logger.error(`Erreur lors exécution cmd '${commandName}' : ${error.stack}`);
        msg.channel.send('Une erreur est survenue lors de l\'exécution de la commande !');
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