const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    ActivityType,
} = require("discord.js");
const succes = require("../data/achievements.json");
const {
    VERY_PALE_VIOLET,
    VERY_PALE_BLUE,
    CRIMSON,
} = require("../data/colors.json");
const { STEAM, ASTATS, CME, SH } = require("../data/emojis.json");
const { createError } = require("../util/envoiMsg");
const { getXpNeededForNextLevel } = require("../util/xp");

const Canvas = require("canvas");
const path = require("node:path");
const { Game, User } = require("../models");
const { getJsonValue } = require("../util/util");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDMPermission(false)
        .setDescription("Affiche le profil d'un utilisateur.")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Cet utilisateur en particulier"),
        )
        .addStringOption((option) =>
            option
                .setName("succes")
                .setDescription("Affiche les succès du profile")
                .setAutocomplete(true),
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused(true);
        const filtered = [];

        if (focusedValue.name === "succes") {
            for (const x in succes) {
                filtered.push({ name: succes[x].title, value: x });
            }
        }
        await interaction.respond(filtered);
    },
    async execute(interaction) {
        const client = interaction.client;
        const user = interaction.options.getUser("target") ?? interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        const typeSucces = interaction.options.get("succes")?.value;

        await interaction.deferReply();

        const dbUser = await client.getUser(member);

        if (!dbUser) {
            // Si pas dans la BDD
            const embedErr = createError(
                `${user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
            );
            return interaction.editReply({ embeds: [embedErr] });
        }

        const colorEmbed =
            dbUser.banned || dbUser.blacklisted ? CRIMSON : VERY_PALE_BLUE; //si banni ou blacklisté -> couleur en rouge
        const pseudo = user.username;
        const money = dbUser.money;
        const level = dbUser.level;
        const xp = dbUser.experience;
        const nextXpNeeded = getXpNeededForNextLevel(dbUser.level);

        // AFFICHAGE SUCCES
        if (typeSucces) {
            const userStat = dbUser.stats;
            const infoSucces = succes[typeSucces];
            // on test si 'money' car non présent dans stat.
            const nbStat =
                typeSucces === "money"
                    ? money
                    : getJsonValue(userStat, infoSucces.db, "");
            let desc = "";
            for (const x in infoSucces.succes) {
                const achieved = nbStat >= Number.parseInt(x);

                if (achieved) {
                    desc += "✅ ";
                } else {
                    desc += "⬛ ";
                }
                desc += `**${infoSucces.succes[x].title}**\n`;

                if (achieved) {
                    desc += `> ${infoSucces.succes[x].desc}\n`;
                } else {
                    desc += `> ||${infoSucces.succes[x].desc}||\n`;
                }
            }
            const embed = new EmbedBuilder()
                .setColor(colorEmbed)
                .setTitle(`${infoSucces.title} de ${user.tag}`)
                .setDescription(`${desc}`);

            return interaction.editReply({ embeds: [embed] });
        }

        // AFFICHAGE CANVAS
        const urlSteam = `[Steam](https://steamcommunity.com/profiles/${dbUser.steamId})`;
        const urlAstats = `[Astats](https://astats.astats.nl/astats/User_Info.php?SteamID64=${dbUser.steamId})`;
        const urlCme = `[Completionist](https://completionist.me/steam/profile/${dbUser.steamId})`;
        const urlSh = `[Steam Hunters](https://steamhunters.com/id/${dbUser.steamId}/games)`;

        const msg = `[ ${STEAM} ${urlSteam} | ${ASTATS} ${urlAstats} | ${CME} ${urlCme} | ${SH} ${urlSh} ]`;

        // recup settings de l'user
        const configProfile = await client.getOrInitProfile(dbUser);
        // -- couleur texte
        const textColor = getByValue(configProfile.text, true);
        // -- couleur/style bordure
        const borderStyle = getByValue(configProfile.border?.style, true);
        const borderColor = getByValue(configProfile.border?.color, true);
        // -- couleur/style bordure avatar
        const borderAvatarStyle = getByValue(configProfile.avatar?.style, true);
        const borderAvatarColor = getByValue(configProfile.avatar?.color, true);
        // -- couleur/style fond
        const backgroundStyle = "";
        const backgroundColor = getByValue(
            configProfile.background?.color,
            true,
        );

        // ---------------
        // CANVAS
        // ---------------
        const CANVAS_WIDTH = 800;
        const CANVAS_HEIGHT = 400;
        const SPACING_ACHIEVEMENTS = 75;

        const canvas = Canvas.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        const ctx = canvas.getContext("2d");

        // ---------------
        // BACKGROUND
        // ---------------
        ctx.fillStyle = "#151e32";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const bgGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 200);
        bgGradient.addColorStop(0, "#4c1d95"); // #4b2aad
        bgGradient.addColorStop(0.5, "#312e81");
        bgGradient.addColorStop(1, "#1e1b4b"); // #1e1e3f
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, 200);

        ctx.save();

        // GRADIENT
        const gradient = ctx.createLinearGradient(40, 40, 160, 160);
        gradient.addColorStop(0, "#9594db");
        gradient.addColorStop(0.5, "#c084fc");
        gradient.addColorStop(1, "#6366f1");

        // GLOW
        ctx.lineWidth = 6; //7
        ctx.strokeStyle = gradient;
        ctx.shadowColor = "#9594db";
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.8;

        roundRect(ctx, 40, 40, 120, 120, 20, false, true, 3);

        ctx.restore();

        // ---------------
        // PROFILE PICTURE
        // ---------------
        ctx.save();
        const userAvatar = await Canvas.loadImage(
            user.displayAvatarURL({ extension: "png", size: 128 }),
        );

        let x = 40;
        const y = 40;
        const w = 120;
        const h = 120;
        const r = 20;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(userAvatar, 40, 40, 120, 120);

        ctx.restore();
        ctx.save();

        ctx.lineWidth = 4; //7
        ctx.strokeStyle = gradient; //"#9594dbff";
        // ctx.shadowColor = "#a78bfa";
        // ctx.shadowBlur = 12;
        // ctx.globalAlpha = 0.9;

        roundRect(ctx, 40, 40, 120, 120, 20, false, true);

        ctx.restore();

        // ---------------
        // PSEUDO
        // ---------------
        ctx.fillStyle = "#fff";

        pseudo.length > 20
            ? (ctx.font = "25px Impact")
            : (ctx.font = "35px Impact");
        ctx.fillText(pseudo, 190, 80, 370);

        // ---------------
        // LEVEL
        // ---------------
        ctx.save();

        x = 190;

        //const barX = 250;
        const barY = 100;
        const barWidth = 150;
        const barHeight = 10;
        const levelText = `Lvl ${level}`;

        ctx.font = "20px Arial";
        ctx.fillStyle = "#fff";
        ctx.fillText(levelText, x, 110); // Lvl -> Niveau ??

        const levelWidth = ctx.measureText(levelText).width;
        const barX = x + levelWidth + 15;

        const percentage = Math.min(xp / nextXpNeeded, 1);
        const progressWidth = barWidth * percentage;
        x += 60;

        // ---------------
        // XP BAR
        // ---------------
        ctx.fillStyle = "#111827";
        roundRect(ctx, barX, barY, barWidth, barHeight, 5, true, false);

        if (progressWidth > 0) {
            const xpGradient = ctx.createLinearGradient(x, 0, x + barWidth, 0);
            xpGradient.addColorStop(0, "#818cf8");
            xpGradient.addColorStop(1, "#c084fc");

            ctx.fillStyle = xpGradient;

            roundRect(
                ctx,
                barX,
                barY,
                progressWidth,
                barHeight,
                5,
                true,
                false,
            );
        }

        ctx.restore();

        // MONEY
        ctx.font = "20px Arial";
        ctx.fillStyle = "#a5b4fc"; // #f1c40f
        ctx.fillText(`${money} ${process.env.MONEY}`, 190, 140);

        // ---------------
        // PLAY
        // ---------------
        x = 550;
        const game = member.presence?.activities.find((a) => a.type === 0);
        if (game) {
            const controller = await Canvas.loadImage(
                path.join(
                    __dirname,
                    "../data/img/discord-green-controller.png",
                ),
            );
            ctx.drawImage(controller, x, 60, 25, 25); // 50
            x += 30;
            ctx.fillText(`${game.name}`, x, 80, 170); // 70
        }

        // -----

        // MONEY + STEAM PLAYTIME
        // TEST - WORK IN PROGRESS
        // const boxWidth = 300;
        // const boxHeight = 70;
        // const boxX = 450;
        // const boxY = 130;
        // x = 450;

        // ctx.strokeStyle = "#00f7ff";
        // ctx.lineWidth = 2;
        // ctx.shadowColor = "#00f7ff";
        // ctx.shadowBlur = 15;
        // roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 20);
        // ctx.shadowBlur = 0;
        // ctx.font = "20px Arial";
        // ctx.fillStyle = "#fff";
        // ctx.fillText(`Temps de jeu ${1000}h`, x + 20, boxY + (boxHeight/2));

        // ---------------
        // SEPARATOR
        // ---------------
        const separator = ctx.createLinearGradient(0, 0, 800, 0);
        separator.addColorStop(0, "transparent");
        separator.addColorStop(0.5, "#6366f1");
        separator.addColorStop(1, "transparent");

        ctx.fillStyle = separator;
        ctx.fillRect(50, 199, 700, 1);

        // ---------------
        // "MEDALS" - Meta achievments
        // ---------------
        const trophy = await Canvas.loadImage(
            path.join(__dirname, "../data/img/trophy.png"),
        );
        ctx.drawImage(trophy, 40, 220);
        ctx.font = "22px Arial";
        ctx.fillStyle = "#fff";
        ctx.fillText(`Achievements`, 70, 240);

        x = 40;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "grey";

        // - recup stats OU achievements lié à user
        const stats = dbUser.stats;
        let positionXY = { crtX: x, crtY: 280 };
        let suffix, colorFill, locked, filename;

        // d'abord l'ombre, puis le fond, puis le trophée (si besoin est)
        // - Hall héros 🏆
        ({ suffix, colorFill, locked } = getAchievementRarity(
            stats.img?.heros,
            100,
            50,
            10,
            1,
        ));
        filename = locked ? "locked" : "trophy" + suffix;

        positionXY = await addAchievement(
            ctx,
            colorFill,
            filename,
            positionXY.crtX,
            positionXY.crtY,
        );

        // - Hall zéros 💩
        positionXY.crtX += SPACING_ACHIEVEMENTS;
        ({ suffix, colorFill, locked } = getAchievementRarity(
            stats.img?.zeros,
            250,
            50,
            10,
            1,
        ));
        filename = locked ? "locked" : "poop" + suffix;

        positionXY = await addAchievement(
            ctx,
            colorFill,
            filename,
            positionXY.crtX,
            positionXY.crtY,
        );

        // - Dmd aides 🤝
        positionXY.crtX += SPACING_ACHIEVEMENTS;
        ({ suffix, colorFill, locked } = getAchievementRarity(
            stats.group?.ended,
            100,
            50,
            25,
            1,
        ));
        filename = locked ? "locked" : "dmd-aide" + suffix;

        positionXY = await addAchievement(
            ctx,
            colorFill,
            filename,
            positionXY.crtX,
            positionXY.crtY,
        );

        // - Shop 💰
        positionXY.crtX += SPACING_ACHIEVEMENTS;
        ({ suffix, colorFill, locked } = getAchievementRarity(
            stats.shop?.sold,
            50,
            25,
            10,
            1,
        ));
        filename = locked ? "locked" : "shop" + suffix;

        positionXY = await addAchievement(
            ctx,
            colorFill,
            filename,
            positionXY.crtX,
            positionXY.crtY,
        );

        // - Nb messages 💬
        positionXY.crtX += SPACING_ACHIEVEMENTS;
        ({ suffix, colorFill, locked } = getAchievementRarity(
            stats.msg,
            10000,
            2500,
            500,
            50,
        ));
        filename = locked ? "locked" : "nbMsg" + suffix;

        positionXY = await addAchievement(
            ctx,
            colorFill,
            filename,
            positionXY.crtX,
            positionXY.crtY,
        );

        // - Event communautaires
        positionXY.crtX += SPACING_ACHIEVEMENTS;
        // advent 2022 🎄
        // - recup nb enigme resolu => succes participatif
        const nbEnigme = dbUser.event[2022]?.advent?.answers
            ? dbUser.event[2022].advent.answers.size
            : 0;
        if (nbEnigme >= 12) {
            // - recup top 10 des user qui ont des points
            const agg = [
                {
                    $match: {
                        "event.2022.advent.score": { $exists: true },
                    },
                },
                {
                    $sort: { "event.2022.advent.score": -1 },
                },
            ];
            const top10 = await User.aggregate(agg);
            const indexUser = top10.findIndex(
                (u) => u.userId === dbUser.userId,
            );

            let filename = "advent_22";
            let colorFill = "grey";

            if (indexUser + 1 === 1) {
                filename += "_plat";
                colorFill = "#1CD6CE"; // ~cyan
            } else if (indexUser + 1 === 2) {
                filename += "_gold";
                colorFill = "#FAC213";
            } else if (indexUser + 1 === 3) {
                filename += "_silver";
                colorFill = "silver";
            }

            positionXY = await addAchievement(
                ctx,
                colorFill,
                filename,
                positionXY,
            );
        }
        // TODO stat
        //const event = await Canvas.loadImage(path.join(__dirname, '../data/img/achievements/event.png'));
        //ctx.drawImage(event, crtX, crtY, 40, 40);

        // - Enigme ❓
        positionXY.crtX += SPACING_ACHIEVEMENTS;
        // TODO manuellement
        //const question = await Canvas.loadImage(path.join(__dirname, '../data/img/achievements/question.png'));
        //ctx.drawImage(question, crtX, crtY, 40, 40);

        // - Easter egg 🥚
        positionXY.crtX += SPACING_ACHIEVEMENTS;
        // TODO
        //const egg = await Canvas.loadImage(path.join(__dirname, '../data/img/achievements/egg.png'));
        //ctx.drawImage(egg, crtX, crtY, 40, 40);

        const file = new AttachmentBuilder(await canvas.toBuffer(), {
            name: `profile_${pseudo}.png`,
        });
        //const attachment = new MessageAttachment(canvas.toBuffer(), `profile_${pseudo}.png`);

        const embed = new EmbedBuilder()
            .setColor(VERY_PALE_VIOLET)
            .setDescription(`${msg}`);

        // Send message
        await interaction.editReply({ embeds: [embed], files: [file] });
    },
};

// TODO a deplacer dans utils..
function getByValue(map, searchValue) {
    for (const [key, value] of map.entries()) {
        if (value === searchValue) {
            return key;
        }
    }
}

function getAchievementRarity(
    progressValue,
    valuePlat,
    valueGold,
    valueSilver,
    valueBronze,
) {
    let suffix = "";
    let colorFill;
    let locked = false;

    if (progressValue >= valuePlat) {
        suffix += "_plat";
        colorFill = "#1CD6CE"; // ~cyan
    } else if (progressValue >= valueGold) {
        suffix += "_gold";
        colorFill = "#FAC213";
    } else if (progressValue >= valueSilver) {
        suffix += "_silver";
        colorFill = "silver";
    } else if (progressValue >= valueBronze) {
        suffix = "";
        colorFill = "grey";
    } else {
        locked = true;
        colorFill = "#313131";
    }

    return {
        suffix,
        colorFill,
        locked,
    };
}

/**
 * Add achievements (shadow and background)
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} colorFill Background color
 * @param {String} filename filename for the achievement
 * @param {Number} crtX current position X
 * @param {Number} crtY current position Y
 */
async function addAchievement(ctx, colorFill, filename, crtX, crtY) {
    // Shadow
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = colorFill;
    roundRect(ctx, crtX + 3, crtY - 2, 60, 60, 10, true, false);

    // Background
    ctx.globalAlpha = 1;
    roundRect(ctx, crtX, crtY - 5, 60, 60, 10, true, false);

    const achievement = await Canvas.loadImage(
        path.join(__dirname, `../data/img/achievements/${filename}.png`),
    );
    ctx.drawImage(achievement, crtX + 5, crtY, 50, 50);

    return { crtX, crtY };
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
    stroke = true,
) {
    if (typeof radius === "number") {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
        radius = { ...{ tl: 0, tr: 0, br: 0, bl: 0 }, ...radius };
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius.br,
        y + height,
    );
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
