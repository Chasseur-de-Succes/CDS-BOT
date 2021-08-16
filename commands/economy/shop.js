const Discord = require('discord.js');
const colors = require('../../data/colors.json');
const { } = require('../../config.js');
const { MESSAGES } = require('../../util/constants');

module.exports.run = (client, message, args) => {
    if(!args[0]) {
        message.channel.send('Boutique en construction');
        
    }
    else {
        if(args[0] == "buy") { // BUY
            message.channel.send('[boutique en construction] buy');
        }
        else { // argument non valide
            message.channel.send('[boutique en construction] utilisation erronée');
        }
    }
}

module.exports.help = MESSAGES.COMMANDS.ECONOMY.SHOP;