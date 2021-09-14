const { MessageEmbed, MessageAttachment } = require("discord.js");
const { PREFIX, MONEY } = require("../../config");
const { very_pale_blue, dark_red, crimson } = require('../../data/colors.json');
const { cross_mark, steam } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants.js');
const Canvas = require('canvas');
const path = require('path');

//Canvas.registerFont('x.ttf', { family: ' name '});

module.exports.run = async (client, message, args) => {
    let member;
    let dbUser;
    if(!args[0]) {
        member = message.member;

        dbUser = await client.getUser(member);
        if(!dbUser) { // Si pas dans la BDD
            embedErr = embedError(`Tu n'as pas encore de compte ! Merci de t'enregistrer avec la commande : \`${PREFIX}register\``)
            return message.channel.send({embeds: [embedErr]});
        }
    }
    else if(message.mentions.users.first()) {
        const user = message.mentions.users.first();
        member = message.guild.members.cache.get(user.id);

        dbUser = await client.getUser(member);
        if(!dbUser) { // Si pas dans la BD
            embedErr = embedError(`${member.user.tag} n'a pas encore de compte !`)
            return message.channel.send({embeds: [embedErr]});
        }
    } else {
        const userId = args[0];
        member = message.guild.members.cache.get(userId);
        if(!member) throw `Aucune personne n'a été trouvé avec l'id : ${member}`;
        
        dbUser = await client.getUser(member);
        if(!dbUser) { // Si pas dans la BDD
            embedErr = embedError(`${member.user.tag} n'a pas encore de compte !`)
            return message.channel.send({embeds: [embedErr]});
        } 
    }

    //console.log(dbUser);
    const msg = `> **Profil** de ${member.user.tag}`;
    const colorEmbed = (dbUser.banned || dbUser.blacklisted) ? crimson : very_pale_blue; //si banni ou blacklisté -> couleur en rouge
    const banned = dbUser.banned ? "[banni]" : "";
    const blacklisted = dbUser.blacklisted ? "[blacklisté]" : "";
    const embed = new MessageEmbed()
        .setColor(colorEmbed)
        .setTitle(`${member.user.username} ${banned}${blacklisted}`)
        .setThumbnail(member.user.displayAvatarURL({dynamic : true, size: 4096}))
        .addFields(
            {name: `:flame: Niveau`, value: `${dbUser.level} (XP: ${dbUser.experience})`},
            {name: `:moneybag: Money`, value: `${dbUser.money} ${MONEY}`},
            {name: `${steam} Compte Steam`, value: `[Steam](http://steamcommunity.com/profiles/${dbUser.steamId})\nSteamID64: ${dbUser.steamId}`, inline: true},
            {name: `Site tracking succès`, value: `[Astats](https://astats.astats.nl/astats/User_Info.php?SteamID64=${dbUser.steamId}) | [Completionist](https://completionist.me/steam/profile/${dbUser.steamId})`, inline: true},
        );

    // CANVAS
    // const canvas = Canvas.createCanvas(500, 500);
    // const ctx = canvas.getContext('2d');
    // const background = await Canvas.loadImage(path.join(__dirname, '../../data/background.jpg'));

    // Arrondir bord background
    // ctx.beginPath();
    // ctx.arc(250,250,0.2*Math.PI,0.4*Math.PI);
    // ctx.closePath();
    // ctx.clip();

    //ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Bordure
    // ctx.strokeStyle = '#DC143C';
    // ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // const attachment = new MessageAttachment(canvas.toBuffer(), 'profile.png');
    
    // Send message
    message.channel.send({content: msg, embeds: [embed]});
    // message.channel.send({content: msg, embeds: [embed], files: [attachment]});

    function embedError(msgError) {
        const embedError = new MessageEmbed()
            .setColor(dark_red)
            .setDescription(`${cross_mark} • ${msgError}`);
        return embedError;
    }
}

module.exports.help = MESSAGES.COMMANDS.MISC.PROFILE;