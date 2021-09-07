const { MESSAGES, TAGS, delay, crtHour } = require('../../util/constants');
const { Permissions } = require('discord.js');
const { check_mark, cross_mark } = require('../../data/emojis.json');
const moment = require("moment");

module.exports.run = async (client, message, args) => {
    // -- test si user a un droit assez elevé pour raffraichir la base de donnée de jeu
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) 
        return message.reply("Tu n'as pas le droit de refresh !")
    
    moment.updateLocale('fr', {relativeTime : Object});
    console.log(`\x1b[34m[INFO]\x1b[0m Début refresh games ..`);
    let startTime = moment();
    let crtIdx = 1, cptGame = 0;

    let msgProgress = await message.channel.send(`Ok c'est parti ! Récupération de tous les jeux..`);

    // recupe depuis l'appid XXX
    //client.getAppList(XXX)
    client.getAppList()
    .then(async appList => {
        let games = appList.body.response.apps;
        msgProgress.edit(`[${crtIdx}/${games.length}] - Traitement des jeux .`);
        // parcours de tous les jeux
        /* for (let i = 0; i < 10; i++) { // test 10 1er jeu
            let game = games[i]; */
        
        // TODO filtrer directement ceux déjà présent en base pour avoir un array plus petit et être + rapide?

        for (const game of games) {
            if (crtIdx % 250 === 0) {
                console.log(`\x1b[34m[INFO]\x1b[0m [${crtHour()}] - ${crtIdx}/${games.length} ..`);
                await msgProgress.edit(`[${crtIdx}/${games.length}] - Traitement des jeux ${".".repeat(((crtIdx/250) % 3) + 1)}`);
            }

            if (game?.appid) {
                let gameDB = await client.findGameByAppid(game.appid);
                // si game existe déjà en base, on skip // TODO a enlever car ~50K game..
                if (gameDB?.length > 0) {
                    console.debug(`GAME ${game.appid} trouvé !`);
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
                            console.log(`\x1b[34m[INFO]\x1b[0m [${crtHour()}] - ${err}, on attend 5 min ..`);
                            await msgProgress.edit(`${crtIdx}/${games.length} - Trop de requêtes vers l'API Steam ! On attends 5 min ⏳`);
                            // att 5 min
                            await delay(300000);
                        }
                    }
                }
            } else {
                console.warn(`\x1b[33m[WARN] \x1b[0mJeu ${game} n'a pas d'appid ou n'existe pas.`);
            }
            
            crtIdx++;
        }

        console.log(`\x1b[34m[INFO]\x1b[0m .. Fin refresh games en [${startTime.toNow()}], ${cptGame} jeux ajoutés`);
        message.react(check_mark);
        await msgProgress.edit(`${cptGame} jeux ajoutés (en ${startTime.toNow()}) ! 👏`);
        // TODO embed
        message.author.send(`Import des jeux terminés : ${cptGame} jeux ajoutés (${startTime.toNow()}) ! 👏`)
    }).catch(err => {
        msgProgress.delete();
        message.react(cross_mark);
        console.log(`\x1b[31m[ERROR] \x1b[0mErreur refresh games : ${err}`);
        return;
    });
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.REFRESHGAMES;