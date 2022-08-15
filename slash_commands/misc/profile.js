const { MessageEmbed, MessageAttachment } = require("discord.js");
const { MONEY } = require("../../config");
const { VERY_PALE_BLUE, CRIMSON } = require('../../data/colors.json');
const { STEAM } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants.js');
const { createError } = require("../../util/envoiMsg");
const { getXpNeededForNextLevel } = require("../../util/xp");

const Canvas = require('canvas');
const path = require('path');
const { cp } = require("fs");
const { Game, User } = require("../../models");

//Canvas.registerFont('x.ttf', { family: ' name '});

module.exports.run = async (interaction) => {
    const id = interaction.options.get('user')?.value;
    const client = interaction.client;
    let member = interaction.member;
    let user = interaction.user;

    if (id) {
        member = await interaction.guild.members.fetch(id).catch(e => {});
        if (!member) {
          const embed = new MessageEmbed().setColor('#e74c3c').setDescription('Invalide ID.');
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        user = member.user;
    }

    let dbUser = await client.getUser(member);

    if (!dbUser) { // Si pas dans la BDD
        const embedErr = createError(`${member.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``)
        return interaction.reply({ embeds: [embedErr] });
    }

    await interaction.deferReply();

    // TODO stats groupe, boutique
    // const msg = `> **Profil** de ${member.user.tag}`;
    const colorEmbed = (dbUser.banned || dbUser.blacklisted) ? CRIMSON : VERY_PALE_BLUE; //si banni ou blacklisté -> couleur en rouge
    const banned = dbUser.banned ? "[banni] " : "";
    const blacklisted = dbUser.blacklisted ? "[blacklisté]" : "";

    const pseudo = member.user.username;
    const money = dbUser.money;
    const level = dbUser.level;
    const xp = dbUser.experience;
    const nextXpNeeded = getXpNeededForNextLevel(dbUser.level);
    console.log(xp, ' / ', nextXpNeeded);

    const embed = new MessageEmbed()
        .setColor(colorEmbed)
        .setTitle(`${pseudo} ${banned}${blacklisted}`)
        .setThumbnail(member.user.displayAvatarURL({dynamic : true, size: 4096}))
        .addFields(
            {name: `:flame: Niveau`, value: `${level} (XP: ${xp})`},
            {name: `:moneybag: Money`, value: `${money} ${MONEY}`},
            {name: `${STEAM} Compte Steam`, value: `[Steam](http://steamcommunity.com/profiles/${dbUser.steamId})\nSteamID64: ${dbUser.steamId}`, inline: true},
            {name: `Site tracking succès`, value: `[Astats](https://astats.astats.nl/astats/User_Info.php?SteamID64=${dbUser.steamId}) | [Completionist](https://completionist.me/steam/profile/${dbUser.steamId})`, inline: true},
        );

    const urlSteam = `[Steam](http://steamcommunity.com/profiles/${dbUser.steamId})`;
    const urlAstats = `[Astats](https://astats.astats.nl/astats/User_Info.php?SteamID64=${dbUser.steamId})`;
    const urlCompletionist = `[Completionist](https://completionist.me/steam/profile/${dbUser.steamId})`;

    const msg = `[ ${STEAM} ${urlSteam} | ${urlAstats} | ${urlCompletionist} ]`;

    // CANVAS
    // TODO
    const canvas = Canvas.createCanvas(460, 185);
    const ctx = canvas.getContext('2d');
    const background = await Canvas.loadImage(path.join(__dirname, '../../data/img/background.jpg'));

    const steamAvatar = await Canvas.loadImage(member.user.displayAvatarURL({format: 'png', size: 96}))

    // Arrondir bord background
    // ctx.beginPath();
    // ctx.arc(250,250,0.2*Math.PI,0.4*Math.PI);
    // ctx.closePath();
    // ctx.clip();

    // FOND
    // QUE FAIT LE JOUEUR ACTUELLEMENT ?
    ctx.font = '15px Impact'
    ctx.fillStyle = 'cyan'
    let activities = member.presence.activities;
    // - filtre 'type' sur 'PLAYING'
    activities = activities.filter(act => act.type === 'PLAYING');
    if (activities.length === 1) {
        const act = activities[0];
        console.log(act);

        const game = act.name;
        //const game = 'Half-Life Deathmatch: Source';
        const width = ctx.measureText(game).width;

        const gameDB = await Game.findOne({ name: game });
        if (gameDB) {
            const gameUrlHeader = `	https://cdn.akamai.steamstatic.com/steam/apps/${gameDB.appid}/capsule_184x69.jpg`;
            try {
                let gameImg = await Canvas.loadImage(gameUrlHeader)
                ctx.drawImage(gameImg, canvas.width - 184 - 10, 40, 184, 69);
            } catch (error) {
                logger.warn(`.. erreur chargement image steam : ${error}`)
            }
        }

        ctx.fillText(`joue à`, canvas.width - 184 - 10, 15)
        ctx.fillText(`${game}`, canvas.width - 184 - 10, 35)
    }

    //ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'cyan';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // AVATAR
    ctx.drawImage(steamAvatar, 10, 10, steamAvatar.width, steamAvatar.height);

    // Bordure avatar
    // TODO shop
    //ctx.lineWidth = 5;
    //ctx.strokeStyle = '#DC143C';
    //ctx.strokeRect(10, 10, steamAvatar.width, steamAvatar.height);
    //ctx.lineWidth = 1;

    // PSEUDO
    let x = 111;

    ctx.font = '30px Impact'
    ctx.fillStyle = 'cyan'
    ctx.fillText(pseudo, x, 40)
    // TODO si pseudo trop grand
    //ctx.fillText('Camper-Hunter', x, 40)

    // LEVEL
    const percentage = Math.floor((xp / nextXpNeeded) * 100);
    const roundedPercent = Math.round(percentage);

    ctx.lineWidth = 14
    ctx.strokeStyle = 'grey'
    ctx.fillStyle = 'grey'
    ctx.fillRect(x, 55, 100, 10)
    ctx.strokeStyle = 'cyan'
    ctx.fillStyle = 'cyan'
    ctx.fillRect(x, 55, roundedPercent, 10)

    ctx.font = '20px Impact'
    ctx.fillText(`lv. ${level}`, x + 105, 65)

    // MONEY
    ctx.font = '17px Impact'
    ctx.fillText(`${money} ${MONEY}`, x, 90)

    // "MEDALS" aka meta achievemnts
    x = 10
    ctx.lineWidth = 14
    ctx.strokeStyle = 'grey'
    ctx.fillStyle = 'grey'

    // - fond
    for (let i = 0; i < 8; i++) {
        //ctx.fillRect(x, 50, 40, 40)
        const squareX = x + (i * 50) + (i * 5);
        const squareY = 120;
        ctx.fillRect(squareX, squareY, 50, 50)
    }
    // - fond pour achievemnt speciaux (derniere ligne)
    ctx.fillRect(x + 50 + 5, 10 + 100 + 10, 50, 50)
    ctx.fillRect(x + 100 + 10, 10 + 100 + 10, 50, 50)

    // - recup stats OU achievements lié à user
    const stats = dbUser.stats;
    // - Hall héros 🏆
    let crtX = x + 5;
    let crtY = 125;
    if (stats.img?.heros >= 100) {
        // TODO bordure speciale (car dernier palier) genre a la steam et ses succes rares
        const trophy = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/trophy_100.png'));
        ctx.drawImage(trophy, crtX, crtY, 40, 40);
    } else if (stats.img?.heros >= 50) {
        const trophy = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/trophy_50.png'));
        ctx.drawImage(trophy, crtX, crtY, 40, 40);
    } else if (stats.img?.heros >= 10) {
        const trophy = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/trophy_10.png'));
        ctx.drawImage(trophy, crtX, crtY, 40, 40);
    } else if (stats.img?.heros >= 1) {
        const trophy = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/trophy.png'));
        ctx.drawImage(trophy, crtX, crtY, 40, 40);
    }

    // - Hall zéros 💩
    crtX += 55; 
    if (stats.img?.zeros >= 250) {
        // TODO bordure speciale (car dernier palier) genre a la steam et ses succes rares
        const poop = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/poop_250.png'));
        ctx.drawImage(poop, crtX, crtY, 40, 40);
    } else if (stats.img?.zeros >= 50) {
        const poop = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/poop_50.png'));
        ctx.drawImage(poop, crtX, crtY, 40, 40);
    } else if (stats.img?.zeros >= 10) {
        const poop = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/poop_10.png'));
        ctx.drawImage(poop, crtX, crtY, 40, 40);
    } else if (stats.img?.zeros >= 1) {
        const poop = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/poop.png'));
        ctx.drawImage(poop, crtX, crtY, 40, 40);
    }
    
    // - Dmd aides 🤝
    crtX += 55;
    if (stats.group?.ended >= 100) {
        // TODO bordure speciale (car dernier palier) genre a la steam et ses succes rares
        const dmdAide = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/dmd-aide_100.png'));
        ctx.drawImage(dmdAide, crtX, crtY, 40, 40);
    } else if (stats.group?.ended >= 50) {
        const dmdAide = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/dmd-aide_50.png'));
        ctx.drawImage(dmdAide, crtX, crtY, 40, 40);
    } else if (stats.group?.ended >= 25) {
        const dmdAide = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/dmd-aide_25.png'));
        ctx.drawImage(dmdAide, crtX, crtY, 40, 40);
    } else if (stats.group?.ended >= 1) {
        const dmdAide = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/dmd-aide.png'));
        ctx.drawImage(dmdAide, crtX, crtY, 40, 40);
    }

    // - Shop 💰
    crtX += 55;
    if (stats.shop?.sold >= 100) {
        // TODO bordure speciale (car dernier palier) genre a la steam et ses succes rares
        const shop = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/shop_100.png'));
        ctx.drawImage(shop, crtX, crtY, 40, 40);
    } else if (stats.shop?.sold >= 50) {
        const shop = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/shop_50.png'));
        ctx.drawImage(shop, crtX, crtY, 40, 40);
    } else if (stats.shop?.sold >= 10) {
        const shop = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/shop_10.png'));
        ctx.drawImage(shop, crtX, crtY, 40, 40);
    } else if (stats.shop?.sold >= 1) {
        const shop = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/shop.png'));
        ctx.drawImage(shop, crtX, crtY, 40, 40);
    }
    
    // - Nb messages 💬
    crtX += 55;
    if (stats.msg >= 10000) {
        // TODO bordure speciale (car dernier palier) genre a la steam et ses succes rares
        const nbMsg = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/nbMsg_10000.png'));
        ctx.drawImage(nbMsg, crtX, crtY, 40, 40);
    } else if (stats.msg >= 2500) {
        const nbMsg = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/nbMsg_2500.png'));
        ctx.drawImage(nbMsg, crtX, crtY, 40, 40);
    } else if (stats.msg >= 500) {
        const nbMsg = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/nbMsg_500.png'));
        ctx.drawImage(nbMsg, crtX, crtY, 40, 40);
    } else if (stats.msg >= 50) {
        const nbMsg = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/nbMsg.png'));
        ctx.drawImage(nbMsg, crtX, crtY, 40, 40);
    }

    // - Event communautaires
    crtX += 55;
    // TODO stat
    //const event = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/event.png'));
    //ctx.drawImage(event, crtX, crtY, 40, 40);

    // - Enigme ❓
    crtX += 55;
    // TODO manuellement
    //const question = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/question.png'));
    //ctx.drawImage(question, crtX, crtY, 40, 40);

    // - Easter egg 🥚
    crtX += 55;
    // TODO
    //const egg = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/egg.png'));
    //ctx.drawImage(egg, crtX, crtY, 40, 40);

    const attachment = new MessageAttachment(canvas.toBuffer(), `profile_${pseudo}.png`);
    
    // Send message
    //await interaction.editReply({ embeds: [embed], files: [attachment] });
    const message = await interaction.editReply({ content: msg, files: [attachment] });
    // message.channel.send({content: msg, embeds: [embed], files: [attachment]});
    await message.suppressEmbeds();
}

module.exports.help = MESSAGES.COMMANDS.MISC.PROFILE;