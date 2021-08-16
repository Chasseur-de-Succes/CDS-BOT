const Discord = require('discord.js');
const { PREFIX } = require('../../config.js');
const colors = require('../../data/colors.json');
const superagent = require('superagent');
const { MESSAGES } = require('../../util/constants.js');

module.exports.run = async (client, message, args) => {
    if (args == "") return message.channel.send(`Please enter the name of the game (Example: \`${PREFIX}${module.exports.help.name} Age of Empires II: Definitive Edition\``);
    let gameName = args.join(' ');

    // GET APPID
    // https://api.steampowered.com/ISteamApps/GetAppList/v2/

    const query = args;
    console.log(gameName);
    console.log(query);
    const search = await superagent.get('https://store.steampowered.com/api/storesearch') //https://api.steampowered.com/ISteamApps/GetAppList/v2/
                                    .query({
                                        cc: 'FR',
                                        l: 'fr',
                                        term: query
                                    });

    if (!search.body.items.length) return message.say(`Pas de résultat trouvé pour **${query}** !`); //query -> gameName
    
    const { appId, tiny_image } = search.body.items[0];

    // let { body } = await superagent.get('https://api.steampowered.com/ISteamApps/GetAppList/v2/'); 
    // for (var i = 0; i < body.applist.apps.length; i++) {
    //     if(body.applist.apps[i].name == gameName) {
    //         const appId = body.applist.apps[i].appid;
    //     }
    // }

    //const appId = args[1];

    // GET INFO
    // https://store.steampowered.com/api/appdetails?appids=[App Id]&cc=[Country Code]

    const { app } = await superagent.get(`https://store.steampowered.com/api/appdetails`).query({ appids: appId }); //?appids=${appId}`); // !!!! ERREUR app undefined
    console.log(app); // !!! ^
    const { data } = app[appId.toString()];
            
    // MESSAGE
    const steamEmbed = new Discord.MessageEmbed()
    .setColor(colors.white)
    .setTitle(data.name)
    .setURL(`https://store.steampowered.com/app/${data.steam_appid}`)
    .addField('Type', "appType")
    .addField('Id', "appId");

    return message.channel.send(steamEmbed);
    
}

module.exports.help = MESSAGES.COMMANDS.MISC.STEAM;