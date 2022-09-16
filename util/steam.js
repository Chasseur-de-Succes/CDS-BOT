const superagent = require('superagent');
const { STEAM_API_KEY } = require('../config');
const { Game } = require('../models');
const { TAGS } = require('./constants');
const { CHECK_MARK, CROSS_MARK } = require('../data/emojis.json')
const { GREEN } = require('../data/colors.json');
const { MessageEmbed } = require('discord.js');
const { delay, crtHour } = require('../util/constants')
const moment = require("moment");

module.exports = client => {
    // TODO revoir exports, un steam.getGamesByName sera mieux qu'un client.getGamesByName
    // -- API -- //
    /**
     * Cherche et retourne seulement les 10 premiers jeux sur le store qui contient le mot 'gameName'
     * @param {String} gameName 
     * @returns Object JSON, au format :
     * { "total":10,
     *   "items":[
     *       {
     *           "type":"app",
     *           "name":"Team Fortress 2",
     *           "id":440,
     *           "tiny_image":"https:\/\/cdn.akamai.steamstatic.com\/steam\/apps\/440\/capsule_231x87.jpg?t=1592263852",
     *           "metascore":"92",
     *           "platforms":{
     *               "windows":true,
     *               "mac":true,
     *               "linux":true
     *           },
     *    "streamingvideo":false
     *   }, ... ]
     *  }
     */
    client.getGamesByName = async gameName => {
        const search = await superagent.get('https://store.steampowered.com/api/storesearch')
                                        .query({
                                            cc: 'FR',
                                            l: 'fr',
                                            term: gameName
                                        });

        return search.body.items;
    };

    client.getAllApps = async () => {
        // https://api.steampowered.com/ISteamApps/GetAppList/v2/?key=xxx

        const search = await superagent.get('https://api.steampowered.com/ISteamApps/GetAppList/v2/')
                                        .query({
                                            key: STEAM_API_KEY
                                        });
        return search.body?.applist?.apps
    };

    client.getCommunityApp = async appid => {
        // https://api.steampowered.com/ICommunityService/GetApps/v1/?key=xxx&appids[0]=xxx
        
        const search = await superagent.get('https://api.steampowered.com/ICommunityService/GetApps/v1/')
                                        .query({
                                            key: STEAM_API_KEY,
                                            appids: {appid},
                                            language: 'fr'
                                        })
                                        .query(`appids[0]=${appid}`);
        return search.body?.response?.apps
    }

    client.getAchievements = async appid => {
        // https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?key=xxx&gameid=xxx
        // https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?key=FC01A70E34CC7AE7174C575FF8D8A07F&gameid=321040
        const search = await superagent.get('https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/')
                                        .query({
                                            key: STEAM_API_KEY,
                                            gameid: appid
                                        });
        return search
    }

   /**
    * Récupère 50K apps qui ne sont ni des DLC, ni des software, ni des vidéos et ni des hardware
    * pour récupérer l'array des apps : 'response.body.response.apps;'
    * @returns Array, au format 
    * apps: [
    *        {"appid":10,"name":"Counter-Strike","last_modified":1602535893,"price_change_number":11974414},
    *        {"appid":20,"name":"Team Fortress Classic","last_modified":1579634708,"price_change_number":11974414},
    *        ...
    *    ]
    */
    client.getAppList = async (lastappid = 0) => {
        // TODO passer à v2 https://stackoverflow.com/questions/46330864/steam-api-all-games 
        // https://steamapi.xpaw.me/#IStoreService/GetAppList
        const response = await superagent.get('https://api.steampowered.com/IStoreService/GetAppList/v1/?')
                .query({
                    key: STEAM_API_KEY,
                    include_games: 1,
                    include_dlc: 0,
                    include_software: 0,
                    include_videos: 0,
                    include_hardware: 0,
                    last_appid: lastappid,
                    max_results: 50000
                });
        /* const response = await superagent.get('https://api.steampowered.com/ISteamApps/GetAppList/v2/?')
            .query({
                key: STEAM_API_KEY,
            }); */
        
        return response;
    };

    /**
     * Récupère les informations d'un jeu Steam en fonction de son appid
     * @param {Number} appid 
     * @returns Object JSON, au format :
     * cf http://waikeitse.com/steam-api-tests-and-examples/ 
     */
    client.getAppDetails = async appid => {
        const response = await superagent.get('https://store.steampowered.com/api/appdetails/?')
        .query({
            key: STEAM_API_KEY,
            appids: appid
        });

        return response;
    };

    /**
     * Récupère les catégories d'un jeu Steam en fonction de son appid
     * @param {Number} appid 
     * @returns Array de tags, si le jeu en a
     */
    client.getTags = async appid => {
        const app = await client.getAppDetails(appid);
        return app?.body[appid]?.data?.categories;
    };

    /**
     * Fournit un résumé complet du joueur
     */
    client.getPlayerSummaries = async userid => {
        const reponse = await superagent.get('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?')
            .query({
                key: STEAM_API_KEY,
                steamids: userid
            });
        return reponse;
    }

    /**
     * 
     */
    client.fetchGame = async (appId, tag, nameTmp) => {
        const app = await client.getAppDetails(appId);
        //console.log(app.body[appId]);

        let gameName = '', type = '';
        let isMulti = false, isCoop = false, hasAchievements = false, isRemoved = false;
        let update = {};

        if (!app?.body[appId]?.success) {
            // - chercher autre part car peut etre jeu "removed"
            const communitApps = await client.getCommunityApp(appId)
            
            if (communitApps[0]?.name) {
                isRemoved = true;
                gameName = communitApps[0]?.name;
                try {
                    await client.getAchievements(appId);
                    
                    type = 'game'
                    hasAchievements = true;
                } catch (err) {
                    hasAchievements = false;
                }
            } else {
                gameName = nameTmp;
                type = 'unknown'
                //throw 'Jeu introuvable !'
            }
        } else {
            type = app.body[appId].data?.type
            gameName = app.body[appId].data?.name
            let tags = app.body[appId].data?.categories
            // au cas où pas de tags ou undefined
            tags = tags ? tags : [];
            // on ne garde que les tags qui nous intéresse (MULTI, COOP et ACHIEVEMENTS)
            // TODO voir pour faire autrement ? récupérer tous les tags peu importe et faire recherche sur les tags via Mongo ?
            isMulti = tags.some(tag => tag.id === TAGS.MULTI.id);
            isCoop = tags.some(tag => tag.id === TAGS.COOP.id);
            hasAchievements = tags.some(tag => tag.id === TAGS.ACHIEVEMENTS.id);
        }
        
        // TODO icon plutot que l'image ? -> recup via API..
        const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`;
        
        const query = { appid: appId };
        update = {
            name: gameName,
            type: type,
            isMulti: isMulti,
            isCoop: isCoop,
            hasAchievements: hasAchievements,
            isRemoved: isRemoved
        };
        
        // on update ou créé le jeu
        await Game.findOneAndUpdate(query, update, { upsert: true });

        const msgCustom = `'${type}' trouvé et mis à jour !`;

        //createLogs(client, interaction.guildId, `${gameName}`, `${msgCustom}`, '', GREEN)

        const embed = new MessageEmbed()
            .setColor(GREEN)
            .setTitle(gameName)
            .setDescription(`${msgCustom}`)
            .setThumbnail(gameUrlHeader)
            .addFields(
                { name: '🌐 Multi', value: isMulti ? CHECK_MARK : CROSS_MARK, inline: true },
                { name: '🤝 Co-op', value: isCoop ? CHECK_MARK : CROSS_MARK, inline: true },
                { name: '🏆 Succès', value: hasAchievements ? CHECK_MARK : CROSS_MARK, inline: true },
                // TODO ajouter lien Steam, ASTATS, CME etc
            )
            .setFooter({ text: `par ${tag}`});
        
        if (isRemoved)
            embed.addFields({ name: '🚫 Removed', value: CHECK_MARK })

        return embed;
    }

    client.fetchAllApps = async () => {
        let startTime = moment();
        let crtIdx = 1, cptGame = 0;

        let apps = await client.getAllApps();
        console.log(`trouvé ${apps.length}`);
        
        // - recup tous les appids de la bdd
        const appidsDB = await Game.distinct('appid')
    
        // - remove name empty 
        apps = apps.filter(item => item.name !== '')
        console.log(`aftr name empty ${apps.length}`);
        
        // - garde seulement les appid divisible par 10 (autres ne sont pas des jeux)
        // TODO je crois ?
        apps = apps.filter(item => item.appid % 10 === 0)
        console.log(`aftr mod 10 ${apps.length}`);
        
        // - remove appids déjà dans la bdd
        // TODO a décommenter
        apps = apps.filter(item => !appidsDB.includes(item.appid))
        console.log(`aftr distinct ${apps.length}`);
    
        // TODO remove encore d'autres ?
    
        for (let i = 0; i < apps.length; i++) {
            if (crtIdx % 250 === 0) {
                logger.info("[" + crtHour() + "] - " + (crtIdx/apps.length) + " ..");
                //await msgProgress.edit(`[${crtIdx}/${apps.length}] - Traitement des jeux ${".".repeat(((crtIdx/250) % 3) + 1)}`);
            }

            const app = apps[i];
            cptGame++;
            
            console.log(` * go ${app.appid} ${app.name}`);
            try {
                await client.fetchGame(app.appid, 'system', app.name);
            } catch (err) {
                console.log('nope ' + app.name);

                if (err.status === 429) {
                    logger.info("\x1b[34m[INFO]\x1b[0m ["+crtHour()+"] - "+err+", on attend 5 min ..");
                    //await msgProgress.edit(`${crtIdx}/${apps.length} - Trop de requêtes vers l'API Steam ! On attends 5 min ⏳`);
                    // att 5 min
                    await delay(300000);

                    // on re essaie 
                    try {
                        await client.fetchGame(app.appid, 'system', app.name);
                    } catch (error) {
                        logger.error(`Ca veut pas, on peut rien faire pour ${app.name}...`);
                    }
                }
            }

            crtIdx++;
        }

        logger.info(".. Fin refresh games, "+cptGame+" jeux ajoutés");
        return `Import des jeux terminés, ${cptGame} jeux ajoutés 👏`
    }
}