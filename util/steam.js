const superagent = require("superagent");
//const { STEAM_API_KEY } = require('../config');
const { GameRepository } = require("../repositories");
const { TAGS } = require("./constants");
const { CHECK_MARK, CROSS_MARK } = require("../data/emojis.json");
const { GREEN } = require("../data/colors.json");
const { EmbedBuilder } = require("discord.js");
const { delay, crtHour } = require("../util/constants");
const { retryAfter5min } = require("./util");
const { sendStackTrace } = require("./envoiMsg");

module.exports = (client) => {
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
    client.getGamesByName = async (gameName) => {
        const search = await superagent
            .get("https://store.steampowered.com/api/storesearch")
            .query({
                cc: "FR",
                l: "fr",
                term: gameName,
            });

        return search.body.items;
    };

    client.getAllApps = async () => {
        // https://api.steampowered.com/ISteamApps/GetAppList/v2/?key=xxx

        const search = await superagent
            .get("https://api.steampowered.com/ISteamApps/GetAppList/v2/")
            .query({
                key: process.env.STEAM_API_KEY,
            });
        return search.body?.applist?.apps;
    };

    client.getCommunityApp = async (appid) => {
        // https://api.steampowered.com/ICommunityService/GetApps/v1/?key=xxx&appids[0]=xxx

        const search = await superagent
            .get("https://api.steampowered.com/ICommunityService/GetApps/v1/")
            .query({
                key: process.env.STEAM_API_KEY,
                appids: { appid },
                language: "fr",
            })
            .query(`appids[0]=${appid}`);
        return search.body?.response?.apps;
    };

    client.getAchievements = async (appid) => {
        // https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?key=xxx&gameid=xxx
        // https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?key=FC01A70E34CC7AE7174C575FF8D8A07F&gameid=321040
        return superagent
            .get(
                "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
            )
            .query({
                key: process.env.STEAM_API_KEY,
                gameid: appid,
            });
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
        return superagent
            .get("https://api.steampowered.com/IStoreService/GetAppList/v1/?")
            .query({
                key: process.env.STEAM_API_KEY,
                include_games: 1,
                include_dlc: 0,
                include_software: 0,
                include_videos: 0,
                include_hardware: 0,
                last_appid: lastappid,
                max_results: 50000,
            });
        /* const response = await superagent.get('https://api.steampowered.com/ISteamApps/GetAppList/v2/?')
            .query({
                key: STEAM_API_KEY,
            }); */
    };

    /**
     * Récupère les informations d'un jeu Steam en fonction de son appid
     * @param {Number} appid
     * @returns Object JSON, au format :
     */
    client.getAppDetails = async (appid) => {
        return superagent
            .get("https://store.steampowered.com/api/appdetails/?")
            .query({
                key: process.env.STEAM_API_KEY,
                appids: appid,
            });
    };

    /**
     * Récupère les catégories d'un jeu Steam en fonction de son appid
     * @param {Number} appid
     * @returns Array de tags, si le jeu en a
     */
    client.getTags = async (appid) => {
        const app = await client.getAppDetails(appid);
        return app?.body[appid]?.data?.categories;
    };

    /**
     * Fournit un résumé complet du joueur
     */
    client.getPlayerSummaries = async (userid) => {
        return superagent
            .get(
                "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?",
            )
            .query({
                key: process.env.STEAM_API_KEY,
                steamids: userid,
            });
    };

    client.getSchemaForGame = async (appid) => {
        // https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=FC01A70E34CC7AE7174C575FF8D8A07F&appid=220&l=french
        const reponse = await superagent
            .get(
                "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?",
            )
            .query({
                key: process.env.STEAM_API_KEY,
                appid: appid,
                l: "french",
            });
        return reponse?.body?.game;
    };

    /**
     * Vérifie si un joueur a obtenu tous les succès d'un jeu et si le jeu a été terminé après une date donnée.
     *
     * Appelle l'API Steam `ISteamUserStats/GetPlayerAchievements/v1/` et analyse la réponse.
     *
     * @param {String|Number} steamId - Identifiant Steam de l'utilisateur.
     * @param {Number|String} appid - AppID du jeu Steam.
     * @param {Date} startDate - Date de début pour vérifier si des succès ont été obtenus après.
     * @returns {Promise<Object>} Objet contenant au minimum :
     * {
     *   gameName: String,               // nom du jeu (si disponible)
     *   hasAllAchievements: Boolean,    // true si tous les succès sont obtenus
     *   firstUnlock: Date|null,         // date du premier succès débloqué (si calculable), sinon null
     *   finishedAfterStart: Boolean,    // true si au moins un succès a été débloqué après startDate
     *   error?: String,                 // présent si l'API retourne une erreur
     *   noAchievements?: String         // présent si aucun succès trouvé pour ce jeu
     * }
     *
     * Remarque :
     * - Format attendu de la réponse de l'API Steam :
     * {
     *  "playerstats": {
     *   "steamID": "76561198000000000",
     *   "gameName": "Half-Life 3",
     *   "achievements": [
     *     {
     *       "apiname": "ACH_CHOMPSKI",
     *       "achieved": 1,
     *       "unlocktime": 1625097600
     *     },
     *     ...
     *   ],
     *   "success": true
     *  }
     * }
     */
    client.hasAllAchievementsAfterDate = async (steamId, appid, startDate) => {
        // Appel à l'API Steam pour vérifier les succès
        const response = await superagent
            .get(
                "http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
            )
            .query({
                key: process.env.STEAM_API_KEY,
                steamid: steamId,
                appid: appid,
            })
            .ok((res) => res.status < 500);

        if (!response.body.playerstats.success) {
            return {
                error: response.body.playerstats.error,
            };
        }

        const gameName = response.body.playerstats.gameName;
        if (!response.body.playerstats.achievements) {
            return {
                gameName: gameName,
                noAchievements: `Aucun succès trouvé pour ce jeu ${gameName}.`,
            };
        }

        const achievements = response.body.playerstats.achievements;

        // simple basique
        const hasAllAchievements = achievements.every(
            (ach) => ach.achieved === 1,
        );

        // filtre les succès débloqués avec un unlocktime valide (> 0) (exemple Tigrou42 et succès de Coloring Pixels : 'Starfall'...)
        const unlockedWithTime = achievements.filter(
            (ach) => ach.achieved === 1 && ach.unlocktime && ach.unlocktime > 0,
        );

        // on check si on a tous les succès avant de chercher le premier unlock (logique)
        let firstUnlock = null;
        if (hasAllAchievements && unlockedWithTime.length > 0) {
            let earliestTs = Infinity;
            // on ne prend pas en compte les succès sans unlocktime
            for (const ach of unlockedWithTime) {
                const ts = ach.unlocktime ? ach.unlocktime * 1000 : Infinity;
                if (ts < earliestTs) earliestTs = ts;
            }
            firstUnlock = earliestTs === Infinity ? null : new Date(earliestTs);
        }

        // check si jeu terminé après le début de l'event
        // PI : passage en timestamp ms pour éviter de créer une Date à chaque boucle
        const startTime = new Date(startDate).getTime();
        const finishedAfterStart = achievements.some(
            (ach) => ach.unlocktime && ach.unlocktime * 1000 > startTime,
        );

        return {
            gameName: gameName,
            hasAllAchievements: hasAllAchievements,
            firstUnlock: firstUnlock,
            finishedAfterStart: finishedAfterStart,
        };
    };

    /**
     *
     */
    client.fetchGame = async (appId, tag, nameTmp, steamClient) => {
        logger.info(`.. fetchGame ${appId}`);
        // TODO check error
        const app = await client.getAppDetails(appId);
        // -- recup nom si pas trouvé
        const communitApps = await client.getCommunityApp(appId);
        // - recup achievements (si présent)
        const resp = await client.getSchemaForGame(appId);

        let gameName;
        let type;
        let iconHash = "";
        let lSucces;
        let isMulti = false;
        let isCoop = false;
        let hasAchievements = false;
        let isRemoved = false;

        if (app?.body[appId]?.success) {
            type = app.body[appId].data?.type;
            gameName = app.body[appId].data?.name;
            let tags = app.body[appId].data?.categories;
            const totalAch = app.body[appId].data?.achievements?.total;

            // au cas où pas de tags ou undefined
            tags = tags ? tags : [];
            // on ne garde que les tags qui nous intéresse (MULTI, COOP et ACHIEVEMENTS)
            // TODO voir pour faire autrement ? récupérer tous les tags peu importe et faire recherche sur les tags via Mongo ?
            isMulti = tags.some((tag) => tag.id === TAGS.MULTI.id);
            isCoop = tags.some((tag) => tag.id === TAGS.COOP.id);
            hasAchievements = typeof totalAch === "number" && totalAch > 0;
        } else if (communitApps[0]?.name) {
            // - chercher autre part car peut etre jeu "removed"
            isRemoved = true;
            gameName = communitApps[0]?.name;

            type = "game";
        } else {
            gameName = nameTmp;
            type = "unknown";
            //throw 'Jeu introuvable !'
        }

        // si jeu a des succès
        if (resp.availableGameStats?.achievements) {
            const achievements = resp.availableGameStats.achievements;

            // - ajout & save succes dans Game
            for (const el of achievements) {
                el.apiName = el.name;
                el.name = undefined;
                el.defaultvalue = undefined;
                el.hidden = undefined;
            }

            lSucces = achievements;
        } else {
            // - save tableau vide
            hasAchievements = false;
            lSucces = [];
        }

        // recup icon
        if (steamClient) {
            // Passing true as the third argument automatically requests access tokens, which are required for some apps
            const result = await steamClient.getProductInfo([appId], [], true);
            // if (result.apps[appId].appinfo?.common?.clienticon)
            //     iconHash = result.apps[appId].appinfo.common.clienticon;
            if (result.apps[appId].appinfo?.common?.icon) {
                iconHash = result.apps[appId].appinfo.common.icon;
            }
        }

        // TODO icon plutot que l'image ? -> recup via API..
        const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`;

        // on update ou créé le jeu
        await GameRepository.upsertFromSteam({
            appid: appId,
            name: gameName,
            type: type,
            iconHash: iconHash,
            isMulti: isMulti,
            isCoop: isCoop,
            hasAchievements: hasAchievements,
            isRemoved: isRemoved,
            achievements: lSucces,
        });

        const msgCustom = `'${type}' trouvé et mis à jour !`;
        logger.info(`.. ${gameName} ('${type}') trouvé et mis à jour !`);

        const embed = new EmbedBuilder()
            .setColor(GREEN)
            .setTitle(gameName)
            .setDescription(`${msgCustom}`)
            .setThumbnail(gameUrlHeader)
            .addFields(
                {
                    name: "🌐 Multi",
                    value: isMulti ? CHECK_MARK : CROSS_MARK,
                    inline: true,
                },
                {
                    name: "🤝 Co-op",
                    value: isCoop ? CHECK_MARK : CROSS_MARK,
                    inline: true,
                },
                {
                    name: "🏆 Succès",
                    value: hasAchievements ? CHECK_MARK : CROSS_MARK,
                    inline: true,
                },
                // TODO ajouter lien Steam, CME etc
            )
            .setFooter({ text: `par ${tag}` });

        if (isRemoved) {
            embed.addFields({ name: "🚫 Removed", value: CHECK_MARK });
        }

        return embed;
    };

    client.fetchAllApps = async (msgProgress) => {
        let crtIdx = 1;
        let cptGame = 0;

        let apps = await client.getAllApps();
        logger.info(`trouvé ${apps.length}`);

        // - remove name empty
        apps = apps.filter((item) => item.name !== "");
        logger.info(`aftr name empty ${apps.length}`);

        // - garde seulement les appid divisible par 10 (autres ne sont pas des jeux)
        // TODO je crois ?
        apps = apps.filter((item) => item.appid % 10 === 0);
        logger.info(`aftr mod 10 ${apps.length}`);

        // - remove appids déjà dans la bdd
        // - recup tous les appids de la bdd
        const appidsDb = await GameRepository.getAppIds();
        const appsDistinct = apps.filter(
            (item) => !appidsDb.includes(item.appid),
        );
        logger.info(` distinct ${appsDistinct.length}`);

        // ne garde que ceux qui n'ont pas de 'type'
        const noType = await GameRepository.getAppIdsWithoutType();
        const appsNoType = apps.filter((item) => noType.includes(item.appid));
        logger.info(` no type ${appsNoType.length}`);

        // fusion des nouvelles appid et des jeux n'ayant pas de type
        apps = appsNoType.concat(appsDistinct);
        // TODO remove encore d'autres ?

        if (msgProgress) {
            await msgProgress.edit(`Trouvé ${nbApps}`);
        }

        for (const i in apps) {
            if (crtIdx % 100 === 0) {
                logger.info(`[${crtHour()}] - ${crtIdx}/${apps.length} ..`);
                if (msgProgress) {
                    await msgProgress.edit(
                        `[${crtIdx}/${
                            apps.length
                        }] - Traitement des jeux ${".".repeat(
                            ((crtIdx / 100) % 3) + 1,
                        )}`,
                    );
                }
            }

            const app = apps[i];
            cptGame++;

            logger.info(` * go ${app.appid} ${app.name}`);
            try {
                await retryAfter5min(async () => {
                    await client.fetchGame(app.appid, "system", app.name);
                });
            } catch (err) {
                logger.info(`nope ${app.name}`);

                if (err.status === 429) {
                    logger.info(
                        `\x1b[34m[INFO]\x1b[0m [${crtHour()}] - ${err}, on attend 5 min ..`,
                    );

                    if (msgProgress) {
                        await msgProgress.edit(
                            `${crtIdx}/${apps.length} - Trop de requêtes vers l'API Steam ! On attends 5 min ⏳`,
                        );
                    }

                    // att 5 min
                    await delay(300000);

                    // on re essaie
                    try {
                        await client.fetchGame(app.appid, "system", app.name);
                    } catch (error) {
                        logger.error(
                            `Ca veut pas, on peut rien faire pour ${app.name}...`,
                        );
                    }
                }
            }

            crtIdx++;
        }

        logger.info(`.. Fin refresh games, ${cptGame} jeux ajoutés`);
        return `Import des jeux terminés, ${cptGame} jeux ajoutés 👏`;
    };

    // Récupère les genres depuis l'API Steam (appId en string ou number)
    client.fetchAppGenres = async (appId) => {
        try {
            const res = await fetch(
                `https://store.steampowered.com/api/appdetails?appids=${appId}`,
            );
            if (!res.ok) return [];
            const json = await res.json();
            const entry = json[String(appId)];
            const data = entry && entry.data;
            if (!data) return [];
            return data.genres || [];
        } catch (err) {
            logger.error("Erreur fetchAppGenres: ", err);
            sendStackTrace(client, err, "Erreur fetchAppGenres Non Gérée");
            return [];
        }
    };

    // Récupère les tags depuis l'API SteamHunters (appId en string ou number)
    client.fetchTags = async (appId) => {
        try {
            const res = await fetch(
                `https://steamhunters.com/api/apps/${appId}`,
            );
            if (!res.ok) return [];
            const json = await res.json();
            // L'API peut retourner un tableau ou un objet ; normaliser
            const data = Array.isArray(json) ? json[0] : json;
            if (!data) return [];
            // Extraire les tags
            const rawTags = data.tags || [];
            return Array.isArray(rawTags) ? rawTags : [];
        } catch (err) {
            logger.error("Erreur fetchSteamHuntersTags: ", err);
            sendStackTrace(
                client,
                err,
                "Erreur fetchSteamHuntersTags Non Gérée",
            );
            return [];
        }
    };
};
