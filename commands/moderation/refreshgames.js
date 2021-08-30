const { MESSAGES, TAGS } = require('../../util/constants');
const { Permissions } = require('discord.js');
const { check_mark, cross_mark } = require('../../data/emojis.json');

module.exports.run = (client, message, args) => {
    // -- test si user a un droit assez elevé pour raffraichir la base de donnée de jeu
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) 
        return message.reply("Tu n'as pas le droit de refresh !")
        
    console.log(`\x1b[34m[INFO]\x1b[0m Début refresh games ..`);
    let startTime = new Date().getTime();
    let elapsedTime = 0, crtIdx = 1;

    message.react('⏳');

    client.getAppList()
    .then(async appList => {
        let games = appList.body.response.apps;
        console.log('TAILLE', games.length);
        // parcours de tous les jeux
        /* for (let i = 0; i < 10; i++) { // test 10 1er jeu
            let game = games[i]; */
        for (const game of games) {
            if (crtIdx % 1000 === 0)
                console.log(`\x1b[34m[INFO]\x1b[0m ${crtIdx}/${games.length} ..`);

            if (game?.appid) {
                let gameDB = await client.findGameByAppid(game.appid);
                // si game existe déjà en base, on skip // TODO a enlever car ~50K game..
                if (gameDB) 
                    console.debug(`\x1b[35m[DEBUG]\x1b[0m ${game.name} existe déjà en base, next`);
                else {
                    // on recup les tags du jeu courant
                    let tags = await client.getTags(game.appid);
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
                }
            } else {
                console.warn(`\x1b[33m[WARN] \x1b[0mJeu ${game} n'a pas d'appid ou n'existe pas.`);
            }
            
            crtIdx++;
        }

        elapsedTime = new Date().getTime() - startTime;
        
        // TODO a décaler vers utils pour passer de ms en format String "pretty"
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = ((elapsedTime % 60000) / 1000).toFixed(0);
        const finalTime = seconds == 60 ? (minutes + 1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds
        console.log(`\x1b[34m[INFO]\x1b[0m .. Fin refresh games en ${finalTime}`);

        message.reactions.removeAll();
        message.react(check_mark);
    }).catch(err => {
        message.reactions.removeAll();
        message.react(cross_mark);
        console.log(`\x1b[31m[ERROR] \x1b[0mErreur refresh games : ${err}`);
        return;
    });
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.REFRESHGAMES;