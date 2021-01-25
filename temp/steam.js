const Discord = require('discord.js');
const config = require('../config.json');
const colors = require('../data/colors.json');
const superagent = require('superagent');

module.exports.run = async (client, message, args) => {
    if (args == "") return message.channel.send('Please enter the name of the game (Example: \`${config.prefix}steam Age of Empires II: Definitive Edition\`');
    let gameName = args;

    // GET APPID
    let { body } = await superagent.get('https://api.steampowered.com/ISteamApps/GetAppList/v2/'); 
    //let appid = body.;

    // GET INFO
    // http://store.steampowered.com/api/appdetails?appids=[App Id]&cc=[Country Code]


    // MESSAGE
    const steamEmbed = new Discord.MessageEmbed()
    .setColor(colors.white)
    .setTitle('Steam');

    message.channel.send(steamEmbed);
}

module.exports.config = {
    name: "steam",
    aliases: [],
    description: "",
    usage: "steam <game name>"
}