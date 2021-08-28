const { search } = require('superagent');
const superagent = require('superagent');
const { STEAM_API_KEY } = require('../config');

module.exports = client => {
    client.findGamesByName = async gameName => {
        /* const query = args;
        console.log(query); */
        const search = await superagent.get('https://store.steampowered.com/api/storesearch')
                                        .query({
                                            cc: 'FR',
                                            l: 'fr',
                                            term: gameName
                                        });

        return search.body.items;
    };

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

    client.getAppDetails = async appid => {
        const response = await superagent.get('https://store.steampowered.com/api/appdetails/?')
            .query({
                key: STEAM_API_KEY,
                appids: appid
            });
        
        return response;
    };
}