const superagent = require('superagent');
const { STEAM_API_KEY } = require('../config');

module.exports = client => {
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
    client.findGamesByName = async gameName => {
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
    client.getAppList = async () => {
        const response = await superagent.get('https://api.steampowered.com/IStoreService/GetAppList/v1/?')
                .query({
                    key: STEAM_API_KEY,
                    include_dlc: false,
                    include_software: false,
                    include_videos: false,
                    include_hardware: false,
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
     * // TODO a revoir et à tester
     * @param {Number} appid 
     * @returns 
     */
    client.getAppDetails = async appid => {
        const response = await superagent.get('https://store.steampowered.com/api/appdetails/?')
            .query({
                key: STEAM_API_KEY,
                appids: appid
            });
        
        return response;
    };
}