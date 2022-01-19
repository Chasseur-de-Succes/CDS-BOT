const superagent = require('superagent');
const { STEAM_API_KEY } = require('../config');
const { TAGS } = require('./constants');

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
}