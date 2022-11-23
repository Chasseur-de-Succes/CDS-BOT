const { MessageEmbed, MessageAttachment } = require("discord.js");
//const { MONEY } = require("../../config");
const succes = require('../../data/achievements.json');
const { VERY_PALE_VIOLET, VERY_PALE_BLUE, CRIMSON } = require('../../data/colors.json');
const { STEAM, ASTATS, CME, SH } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants.js');
const { createError } = require("../../util/envoiMsg");
const { getXpNeededForNextLevel } = require("../../util/xp");

const Canvas = require('canvas');
const path = require('path');
const { Game, User } = require("../../models");

//Canvas.registerFont('x.ttf', { family: ' name '});

module.exports.run = async (interaction) => {
    const id = interaction.options.get('user')?.value;
    let typeSucces = interaction.options.get('succes')?.value;
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

    // const msg = `> **Profil** de ${member.user.tag}`;
    const colorEmbed = (dbUser.banned || dbUser.blacklisted) ? CRIMSON : VERY_PALE_BLUE; //si banni ou blacklisté -> couleur en rouge

    const pseudo = member.user.username;
    const money = dbUser.money;
    const level = dbUser.level;
    const xp = dbUser.experience;
    const nextXpNeeded = getXpNeededForNextLevel(dbUser.level);

    if (typeSucces) {
        const userStat = dbUser.stats;
        const infoSucces = succes[typeSucces];
        // on test si 'money' car non présent dans stat.
        const nbStat = typeSucces === 'money' ? money : getJSONValue(userStat, infoSucces.db, '')
        let desc = ``;
        for (let x in infoSucces.succes) {
            const achieved = nbStat >= parseInt(x);
            
            if (achieved)
                desc += `✅ `
            else
                desc += `⬛ `
            desc += `**${infoSucces.succes[x].title}**\n`
    
            if (achieved)
                desc += `> ${infoSucces.succes[x].desc}\n`
            else
                desc += `> ||${infoSucces.succes[x].desc}||\n`
        }
        const embed = new MessageEmbed()
            .setColor(colorEmbed)
            .setTitle(`${infoSucces.title} de ${user.tag}`)
            .setDescription(`${desc}`);
    
        return await interaction.editReply({ embeds: [embed] });
    }

    const urlSteam = `[Steam](http://steamcommunity.com/profiles/${dbUser.steamId})`;
    const urlAstats = `[Astats](https://astats.astats.nl/astats/User_Info.php?SteamID64=${dbUser.steamId})`;
    const urlCME = `[Completionist](https://completionist.me/steam/profile/${dbUser.steamId})`;
    const urlSH = `[Steam Hunters](https://steamhunters.com/id/${dbUser.steamId}/games)`;

    const msg = `[ ${STEAM} ${urlSteam} | ${ASTATS} ${urlAstats} | ${CME} ${urlCME} | ${SH} ${urlSH} ]`;

    // recup settings de l'user 
    const configProfile = await client.getOrInitProfile(dbUser);
    // -- couleur texte
    const textColor = getByValue(configProfile.text, true);
    // -- couleur/style bordure
    const borderStyle = getByValue(configProfile.border?.style, true);
    // TODO si border speciale, pas de couleur ?
    const borderColor = getByValue(configProfile.border?.color, true);
    // -- couleur/style bordure avatar
    const borderAvatarStyle = getByValue(configProfile.avatar?.style, true);
    const borderAvatarColor = getByValue(configProfile.avatar?.color, true);
    // -- couleur/style fond
    const backgroundStyle = '';
    // TODO si background speciale, pas de couleur
    const backgroundColor = getByValue(configProfile.background?.color, true);

    // CANVAS
    // TODO
    const canvas = Canvas.createCanvas(480, 205);
    const ctx = canvas.getContext('2d');
    const background = await Canvas.loadImage(path.join(__dirname, '../../data/img/background.jpg'));

    const steamAvatar = await Canvas.loadImage(member.user.displayAvatarURL({format: 'png', size: 96}))

    // Arrondir bord background
    // ctx.beginPath();
    // ctx.arc(250,250,0.2*Math.PI,0.4*Math.PI);
    // ctx.closePath();
    // ctx.clip();
    
    //ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    // BACKGROUND
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = backgroundColor
    // - STYLE BORDER
    // TODO refactor pour n'avoir qu'une méthode ? car similaire au tracé des bordures de l'avatar
    
    if (borderStyle === 'double'){
        ctx.lineWidth = 2;
        // TODO a revoir
        if (borderStyle === 'dashed')
            ctx.setLineDash([10]);
        else if (borderStyle === 'dotted')
            ctx.setLineDash([2, 5]);
        
        // fond couleur (pas derriere meta succes)
        roundRect(ctx, 5, 5, canvas.width -10, 120, 10, true, false);
            
        roundRect(ctx, 5, 5, canvas.width - 10, canvas.height - 10, 15, false, true);
        roundRect(ctx, 10, 10, canvas.width -20, canvas.height -20, 10, false, true);

    } else {
        ctx.lineWidth = 3;
        if (borderStyle === 'dashed')
            ctx.setLineDash([10]);
        else if (borderStyle === 'dotted')
            ctx.setLineDash([2, 5]);
        
        // fond couleur (pas derriere meta succes)
        roundRect(ctx, 5, 5, canvas.width -10, 120, 10, true, false);

        roundRect(ctx, 5, 5, canvas.width -10, canvas.height -10, 10, false, true);
    }
    ctx.setLineDash([]);

    // QUE FAIT LE JOUEUR ACTUELLEMENT ?
    // TODO ou le dernier jeu joué ?
    ctx.font = '15px Impact'
    ctx.fillStyle = textColor

    if (member.presence) {
        let activities = member.presence.activities;
        // - filtre 'type' sur 'PLAYING'
        activities = activities.filter(act => act.type === 'PLAYING');
        if (activities.length === 1) {
            const act = activities[0];
    
            const game = act.name;
            //const game = 'Half-Life Deathmatch: Source';
            const width = ctx.measureText(game).width;
    
            const gameDB = await Game.findOne({ name: game });
            if (gameDB) {
                const gameUrlHeader = `	https://cdn.akamai.steamstatic.com/steam/apps/${gameDB.appid}/capsule_184x69.jpg`;
                try {
                    let gameImg = await Canvas.loadImage(gameUrlHeader)
                    ctx.drawImage(gameImg, canvas.width - 194 - 10, 50, 184, 69);
                } catch (error) {
                    logger.warn(`.. erreur chargement image steam : ${error}`)
                }
            }
    
            ctx.fillText(`actuellement sur`, canvas.width - 194 - 10, 25)
            ctx.fillText(`${game}`, canvas.width - 194 - 10, 45)
        }
    }

    // AVATAR
    // ROND
    // TODO if profile rond
    ctx.save();
    //ctx.beginPath();
    //ctx.arc(10 + steamAvatar.width/2, 10 + steamAvatar.height/2, 50, 0, 2 * Math.PI);
    //ctx.closePath();
    //ctx.clip();

    //ctx.drawImage(steamAvatar, 20, 20, steamAvatar.width, steamAvatar.height);
    // TODO round rect
    ctx.drawImage(steamAvatar, 20, 20, 96, 96);

    // Bordure avatar
    ctx.lineWidth = 5;
    ctx.strokeStyle = borderAvatarColor;
    ctx.fillStyle = borderAvatarStyle;
    // TODO si rond
    //roundRect(ctx, 20, 20, steamAvatar.width, steamAvatar.height, 10, false, true);
    //roundRect(ctx, 20, 20, 96, 96, 10, false, true);
    
    // - STYLE BORDER
    if (borderAvatarStyle === 'double'){
        ctx.lineWidth = 3;
        
        roundRect(ctx, 20, 20, 96, 96, 15, false, true);
        roundRect(ctx, 25, 25, 96 - 10, 96 - 10, 10, false, true);
    } else {
        if (borderAvatarStyle === 'dashed') {
            ctx.setLineDash([8]);
        } else if (borderAvatarStyle === 'dotted') {
            ctx.lineWidth = 3;
            ctx.setLineDash([3, 4]);
        }
            
        roundRect(ctx, 20, 20, 96, 96, 10, false, true);
    }
    ctx.setLineDash([]);
    
    ctx.restore();

    // PSEUDO
    let x = 126;

    ctx.font = '30px Impact'
    ctx.fillStyle = textColor
    // 145 : si pseudo trop grand
    ctx.fillText(pseudo, x, 50, 145)

    // LEVEL
    const percentage = Math.floor((xp / nextXpNeeded) * 100);
    const roundedPercent = Math.round(percentage);

    ctx.lineWidth = 14
    ctx.strokeStyle = 'grey'
    ctx.fillStyle = 'grey'
    ctx.fillRect(x, 55, 100, 10)
    ctx.strokeStyle = textColor
    ctx.fillStyle = textColor
    ctx.fillRect(x, 55, roundedPercent, 10)

    ctx.font = '20px Impact'
    ctx.fillText(`lv. ${level}`, x + 105, 65)

    // MONEY
    ctx.font = '17px Impact'
    ctx.fillText(`${money} ${process.env.MONEY}`, x, 85)

    // "MEDALS" aka meta achievemnts
    x = 20
    ctx.lineWidth = 2
    ctx.strokeStyle = 'black'
    ctx.fillStyle = 'grey'

    // - recup stats OU achievements lié à user
    const stats = dbUser.stats;
    let crtX = x;
    let crtY = 140;
    
    // d'abord l'ombre, puis le fond, puis le trophée (si besoin est)
    // - Hall héros 🏆
    if (stats.img?.heros >= 1) {
        let filename = 'trophy';
        let colorFill = 'grey';

        if (stats.img?.heros >= 100) {
            filename += '_plat';
            colorFill = '#1CD6CE'; // ~cyan
        } else if (stats.img?.heros >= 50) {
            filename += '_gold';
            colorFill = '#FAC213';
        } else if (stats.img?.heros >= 10) {
            filename += '_silver';
            colorFill = 'silver';
        }

        // ombre
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = colorFill;
        roundRect(ctx, crtX + 3, 135 + 3, 50, 50, 10, true, false);
        
        // fond
        ctx.globalAlpha = 1;
        roundRect(ctx, crtX, 135, 50, 50, 10, true, false);

        const trophy = await Canvas.loadImage(path.join(__dirname, `../../data/img/achievements/${filename}.png`));
        ctx.drawImage(trophy, crtX + 5, crtY, 40, 40);
    }

    // - Hall zéros 💩
    crtX += 55;
    if (stats.img?.zeros >= 1) {
        let filename = 'poop';
        let colorFill = 'grey';

        if (stats.img?.zeros >= 250) {
            filename += '_plat';
            colorFill = '#1CD6CE'; // ~cyan
        } else if (stats.img?.zeros >= 50) {
            filename += '_gold';
            colorFill = '#FAC213';
        } else if (stats.img?.zeros >= 10) {
            filename += '_silver';
            colorFill = 'silver';
        }

        // ombre
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = colorFill;
        roundRect(ctx, crtX + 3, 135 + 3, 50, 50, 10, true, false);
        
        // fond
        ctx.globalAlpha = 1;
        roundRect(ctx, crtX, 135, 50, 50, 10, true, false);

        const poop = await Canvas.loadImage(path.join(__dirname, `../../data/img/achievements/${filename}.png`));
        ctx.drawImage(poop, crtX + 5, crtY, 40, 40);
    }
    
    // - Dmd aides 🤝
    crtX += 55;
    if (stats.group?.ended >= 1) {
        let filename = 'dmd-aide';
        let colorFill = 'grey';

        if (stats.group?.ended >= 100) {
            filename += '_plat';
            colorFill = '#1CD6CE'; // ~cyan
        } else if (stats.group?.ended >= 50) {
            filename += '_gold';
            colorFill = '#FAC213';
        } else if (stats.group?.ended >= 25) {
            filename += '_silver';
            colorFill = 'silver';
        }

        // ombre
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = colorFill;
        roundRect(ctx, crtX + 3, 135 + 3, 50, 50, 10, true, false);
        
        // fond
        ctx.globalAlpha = 1;
        roundRect(ctx, crtX, 135, 50, 50, 10, true, false);

        const dmdAide = await Canvas.loadImage(path.join(__dirname, `../../data/img/achievements/${filename}.png`));
        ctx.drawImage(dmdAide, crtX + 5, crtY, 40, 40);
    }

    // - Shop 💰
    crtX += 55;
    if (stats.shop?.sold >= 1) {
        let filename = 'shop';
        let colorFill = 'grey';

        if (stats.shop?.sold >= 50) {
            filename += '_plat';
            colorFill = '#1CD6CE'; // ~cyan
        } else if (stats.shop?.sold >= 25) {
            filename += '_gold';
            colorFill = '#FAC213';
        } else if (stats.shop?.sold >= 10) {
            filename += '_silver';
            colorFill = 'silver';
        }

        // ombre
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = colorFill;
        roundRect(ctx, crtX + 3, 135 + 3, 50, 50, 10, true, false);
        
        // fond
        ctx.globalAlpha = 1;
        roundRect(ctx, crtX, 135, 50, 50, 10, true, false);

        const dmdAide = await Canvas.loadImage(path.join(__dirname, `../../data/img/achievements/${filename}.png`));
        ctx.drawImage(dmdAide, crtX + 5, crtY, 40, 40);
    }
    
    // - Nb messages 💬
    crtX += 55;
    if (stats.msg >= 50) {
        let filename = 'nbMsg';
        let colorFill = 'grey';

        if (stats.msg >= 10000) {
            filename += '_plat';
            colorFill = '#1CD6CE'; // ~cyan
        } else if (stats.msg >= 2500) {
            filename += '_gold';
            colorFill = '#FAC213';
        } else if (stats.msg >= 500) {
            filename += '_silver';
            colorFill = 'silver';
        }

        // ombre
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = colorFill;
        roundRect(ctx, crtX + 3, 135 + 3, 50, 50, 10, true, false);
        
        // fond
        ctx.globalAlpha = 1;
        roundRect(ctx, crtX, 135, 50, 50, 10, true, false);

        const dmdAide = await Canvas.loadImage(path.join(__dirname, `../../data/img/achievements/${filename}.png`));
        ctx.drawImage(dmdAide, crtX + 5, crtY, 40, 40);
    }

    // - Event communautaires
    crtX += 55;
         // advent 2022 🎄
    // - recup nb enigme resolu => succes participatif
    const nbEnigme = dbUser.event[2022]?.advent?.answers ? dbUser.event[2022].advent.answers.size : 0;
    if (nbEnigme >= 12) {
        // - recup top 10 des user qui ont des points
        const agg = [{
                $match :{
                    'event.2022.advent.score': { '$exists': true }
                }
            },
            {
                $sort: { "event.2022.advent.score": -1 }
            }
        ]
        const top10 = await User.aggregate(agg);
        let indexUser = top10.findIndex(u => u.userId === dbUser.userId);

        let filename = 'advent_22';
        let colorFill = 'grey';

        if (indexUser + 1 == 1) {
            filename += '_plat';
            colorFill = '#1CD6CE'; // ~cyan
        } else if (indexUser + 1 == 2) {
            filename += '_gold';
            colorFill = '#FAC213';
        } else if (indexUser + 1 == 3) {
            filename += '_silver';
            colorFill = 'silver';
        }

        // ombre
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = colorFill;
        roundRect(ctx, crtX + 3, 135 + 3, 50, 50, 10, true, false);
        
        // fond
        ctx.globalAlpha = 1;
        roundRect(ctx, crtX, 135, 50, 50, 10, true, false);

        const advent = await Canvas.loadImage(path.join(__dirname, `../../data/img/achievements/event/${filename}.png`));
        ctx.drawImage(advent, crtX + 5, crtY, 40, 40);
    }
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

    let embed = new MessageEmbed()
        .setColor(VERY_PALE_VIOLET)
        .setDescription(`${msg}`);
    
    // Send message
    await interaction.editReply({ embeds: [embed], files: [attachment] });
}

// TODO a deplacer dans utils..
function getByValue(map, searchValue) {
    for (let [key, value] of map.entries()) {
        if (value === searchValue)
        return key;
    }
}

/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object 
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */
 function roundRect(
    ctx,
    x,
    y,
    width,
    height,
    radius = 5,
    fill = false,
    stroke = true
  ) {
    if (typeof radius === 'number') {
      radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
      radius = {...{tl: 0, tr: 0, br: 0, bl: 0}, ...radius};
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }

  // recup la valeur d'un chemin dans un JSON
  // ex: path = 'img.heros' dans { img: {heros: 1} } retourne '1'
  var getJSONValue = function (model, path, def) {
    path = path || '';
    model = model || {};
    def = typeof def === 'undefined' ? '' : def;
    var parts = path.split('.');
    if (parts.length > 1 && typeof model[parts[0]] === 'object') {
      return getJSONValue(model[parts[0]], parts.splice(1).join('.'), def);
    } else {
      return model[parts[0]] || def;
    }
  } 

module.exports.help = MESSAGES.COMMANDS.MISC.PROFILE;