const { MESSAGES, TAGS, delay, crtHour } = require('../../util/constants');
const { Permissions } = require('discord.js');
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const moment = require("moment");
const { Game } = require('../../models');

module.exports.run = async (client, message, args) => {
    // -- test si user a un droit assez elevé pour raffraichir la base de donnée de jeu
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) 
        return message.reply("Tu n'as pas le droit de refresh !")
    
    moment.updateLocale('fr', {relativeTime : Object});
    logger.info("Début refresh games ..");
    
    let msgProgress = await message.channel.send(`Ok c'est parti ! Cela peut prendre du temps.. 
    Récupération de tous les jeux..`);

    try {
        const msgFin = await client.fetchAllApps();

        msgProgress.edit(`${msgFin}`);
    } catch (err) {
        msgProgress.delete();
        message.react(CROSS_MARK);
        logger.error("Erreur refresh games : " + err);
        console.log(err);
        return;
    }
    
    return;

    // TODO certains jeux passe entre les mailles du filet (ceux qui ont un appid < au max)
    // => refaire depuis le début, avec pagination (une fois les 50000 fait, next page depuis le dernier id)
    // TODO comment faire pour les jeux qui sont enlevés du store ?
    // recupe depuis l'appid XXX
    // 1158160
    const maxAppid = !args[0] ? await client.findMaxAppId() : args[0];
    client.getAppList(maxAppid)
    .then(async appList => {
        let games = appList.body.response.apps;
        
        if (games) {
            msgProgress.edit(`[${crtIdx}/${games.length}] - Traitement des jeux .`);
            
            // parcours de tous les jeux
            for (const game of games) {
                if (crtIdx % 250 === 0) {
                    logger.info("[" + crtHour() + "] - " + (crtIdx/games.length) + " ..");
                    await msgProgress.edit(`[${crtIdx}/${games.length}] - Traitement des jeux ${".".repeat(((crtIdx/250) % 3) + 1)}`);
                }
    
                if (game?.appid) {
                    let gameDB = await client.findGameByAppid(game.appid);
                    // si game existe déjà en base, on skip // TODO a enlever car ~50K game..
                    if (gameDB) {
                        // logger.debug("GAME " + game.appid + " trouvé !");
                    } else {
                        // on recup les tags du jeu courant
                        try {
                            let app = await client.getAppDetails(game.appid);
                            let tags = app?.body[game.appid]?.data?.categories
                            // au cas où pas de tags ou undefined
                            tags = tags ? tags : [];
                            // on ne garde que les tags qui nous intéresse (MULTI, COOP et ACHIEVEMENTS)
                            // TODO voir pour faire autrement ? récupérer tous les tags peu importe et faire recherche sur les tags via Mongo ?
                            let isMulti = tags.some(tag => tag.id === TAGS.MULTI.id);
                            let isCoop = tags.some(tag => tag.id === TAGS.COOP.id);
                            let hasAchievements = tags.some(tag => tag.id === TAGS.ACHIEVEMENTS.id);
                            
                            // on créé un nouveau Game
                            let newGame = {
                                appid: game.appid,
                                name: game.name,
                                isMulti: isMulti,
                                isCoop: isCoop,
                                hasAchievements: hasAchievements
                            }
                            await client.createGame(newGame);
                            cptGame++;
                        } catch (err) {
                            if (err.status === 429) {
                                logger.info("\x1b[34m[INFO]\x1b[0m ["+crtHour()+"] - "+err+", on attend 5 min ..");
                                await msgProgress.edit(`${crtIdx}/${games.length} - Trop de requêtes vers l'API Steam ! On attends 5 min ⏳`);
                                // att 5 min
                                await delay(300000);
                            }
                        }
                    }
                } else {
                    logger.warn("Jeu "+game+" n'a pas d'appid ou n'existe pas.");
                }
                
                crtIdx++;
            }
    
            logger.info(".. Fin refresh games en ["+startTime.toNow()+"], "+cptGame+" jeux ajoutés");
            message.react(CHECK_MARK);
            await msgProgress.edit(`${cptGame} jeux ajoutés (en ${startTime.toNow()}) ! 👏`);
            // TODO embed
            message.author.send(`Import des jeux terminés : ${cptGame} jeux ajoutés (${startTime.toNow()}) ! 👏`)
        } else {
            message.react(CHECK_MARK);
            await msgProgress.edit(`Aucun nouveau jeu à ajouter ! 👏`);
        }
    }).catch(err => {
        msgProgress.delete();
        message.react(CROSS_MARK);
        logger.error("Erreur refresh games : " + err);
        return;
    });
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.REFRESHGAMES;
