const themes = require("./themes");
const { getAchievementRarity, getAdventAchievementRarity } = require("./achievementUtils");

const Canvas = require("canvas");
const sharp = require("sharp");
const path = require("node:path");
const { User } = require("../../models");

const ACHIEVEMENT_RARITY_SUFFIX = {
    platinum: "_plat",
    gold: "_gold",
    silver: "_silver",
    bronze: "",
    locked: "",
};

async function renderProfile(data, themeName = "default") {
    const theme = themes[themeName] ?? themes.default;

    // ---------------
    // CUSTOM FONTS
    // ---------------
    Canvas.registerFont(
        path.join(__dirname, "../../data/fonts/Oxanium-Medium.ttf"),
        {
            family: "Oxanium",
            weight: "500",
        },
    );

    Canvas.registerFont(
        path.join(__dirname, "../../data/fonts/Oxanium-SemiBold.ttf"),
        {
            family: "Oxanium",
            weight: "600",
        },
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
    const HEIGHT_HEADER = 200;

    ctx.fillStyle = theme.background.color;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const bgGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, HEIGHT_HEADER);
    bgGradient.addColorStop(0, theme.background.headerGradient[0]);
    bgGradient.addColorStop(0.5, theme.background.headerGradient[1]);
    bgGradient.addColorStop(1, theme.background.headerGradient[2]);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HEIGHT_HEADER);

    ctx.save();

    // ---------------
    // PROFILE PICTURE
    // ---------------
    // GRADIENT
    const gradient = ctx.createLinearGradient(40, 40, 160, 160);
    gradient.addColorStop(0, theme.avatar.gradient[0]);
    gradient.addColorStop(0.5, theme.avatar.gradient[1]);
    gradient.addColorStop(1, theme.avatar.gradient[2]);

    // GLOW
    ctx.lineWidth = 6;
    ctx.strokeStyle = gradient;
    ctx.shadowColor = theme.avatar.glow;
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.8;

    roundRect(ctx, 40, 40, 120, 120, 20, false, true, 3);

    ctx.restore();

    // AVATAR
    ctx.save();
    const userAvatar = await Canvas.loadImage(
        data.user.displayAvatarURL({ extension: "png", size: 128 }),
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
    ctx.strokeStyle = gradient;

    roundRect(ctx, 40, 40, 120, 120, 20, false, true);

    ctx.restore();

    // ---------------
    // FLAG
    // ---------------
    let hasFlag = false;
    if (data.codeFlag) { // undefined si pas de drapeau
        hasFlag = await drawFlag(ctx, data.codeFlag, 190, 59, 28, 21); // ou bien 32 × 24 ?
    }

    // ---------------
    // PSEUDO
    // ---------------
    const xPseudo = hasFlag ? 228 : 190;
    ctx.fillStyle = theme.text.primary;

    data.pseudo.length > 25
        ? (ctx.font = "600 25px Oxanium")
        : (ctx.font = "600 35px Oxanium");
    ctx.fillText(data.pseudo, xPseudo, 80, 470);

    // ---------------
    // LEVEL
    // ---------------
    ctx.save();

    x = 190;

    const barY = 100;
    const barWidth = 150;
    const barHeight = 10;
    const levelText = `Lvl ${data.level}`;

    ctx.font = "500 20px Oxanium";
    ctx.fillStyle = theme.text.primary;
    ctx.fillText(levelText, x, 110);

    const levelWidth = ctx.measureText(levelText).width;
    const barX = x + levelWidth + 15;

    const percentage = Math.min(data.xp / data.nextXpNeeded, 1);
    const progressWidth = barWidth * percentage;
    x += 60;

    // ---------------
    // XP BAR
    // ---------------
    ctx.fillStyle = theme.xpBar.background;
    roundRect(ctx, barX, barY, barWidth, barHeight, 5, true, false);

    if (progressWidth > 0) {
        const xpGradient = ctx.createLinearGradient(x, 0, x + barWidth, 0);
        xpGradient.addColorStop(0, theme.xpBar.fillGradient[0]);
        xpGradient.addColorStop(1, theme.xpBar.fillGradient[1]);

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

    // ---------------
    // MONEY
    // ---------------
    ctx.font = "500 20px Oxanium";
    ctx.fillStyle = theme.text.secondary;
    ctx.fillText(`${data.money} ${process.env.MONEY}`, 190, 140);

    // ---------------
    // PLAYING
    // ---------------
    x = 550;
    const game = data.game;
    if (game) {
        const controller = await Canvas.loadImage(
            path.join(
                __dirname,
                "../../data/img/discord-green-controller.png",
            ),
        );
        ctx.font = "600 20px Oxanium";
        ctx.drawImage(controller, x, 90, 25, 25);
        x += 30;
        ctx.fillText(`${game.name}`, x, 110, 170);
    }

    // ---------------
    // SEPARATOR
    // ---------------
    const separator = ctx.createLinearGradient(0, 0, 800, 0);
    separator.addColorStop(0, theme.separator[0]);
    separator.addColorStop(0.5, theme.separator[1]);
    separator.addColorStop(1, theme.separator[2]);

    ctx.fillStyle = separator;
    ctx.fillRect(50, 199, 700, 1);

    // ---------------
    // "MEDALS" - Meta achievements
    // ---------------
    // Title
    const trophy = await Canvas.loadImage(
        path.join(__dirname, "../../data/img/trophy.png"),
    );
    ctx.drawImage(trophy, 40, 220);
    ctx.font = "600 22px Oxanium";
    ctx.fillStyle = theme.medals.title;
    ctx.fillText(`SUCCÈS`, 70, 240);

    // - recup stats OU achievements lié à user
    const ACHIEVEMENTS = [
        {
            // - Hall héros 🏆
            progressValue: data.stats.img?.heros,
            thresholds: [100, 50, 10, 1],
            filename: "trophy",
        },
        {
            // - Hall zéros 💩
            progressValue: data.stats.img?.zeros,
            thresholds: [250, 50, 10, 1],
            filename: "poop",
        },
        {
            // - Dmd aides 🤝
            progressValue: data.stats.group?.ended,
            thresholds: [100, 50, 25, 1],
            filename: "dmd-aide",
        },
        {
            // - Shop 💰
            progressValue: data.stats.shop?.sold,
            thresholds: [50, 25, 10, 1],
            filename: "shop",
        },
        {
            // - Nb messages 💬
            progressValue: data.stats.msg,
            thresholds: [10000, 2500, 500, 50],
            filename: "nbMsg",
        },
    ];

    x = 40;
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.medals.border;
    ctx.fillStyle = theme.medals.background;

    let positionXY = { crtX: x, crtY: 280 };

    for (const achievement of ACHIEVEMENTS) {
        await addAchievementByRarity(
            ctx,
            positionXY,
            achievement.progressValue,
            achievement.thresholds,
            achievement.filename,
            theme
        );
        positionXY.crtX += SPACING_ACHIEVEMENTS;
    }

    // - Event communautaires
    // advent 2022 🎄
    // - recup nb enigme resolu => succes participatif
    const nbEnigme = data.dbUser.event[2022]?.advent?.answers
        ? data.dbUser.event[2022].advent.answers.size
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
            (u) => u.userId === data.dbUser.userId,
        );

        const rarity = getAdventAchievementRarity(indexUser);
        const colorFill = {
            platinum: theme.medals.achievement.platinum,
            gold: theme.medals.achievement.gold,
            silver: theme.medals.achievement.silver,
            bronze: theme.medals.achievement.bronze,
            locked: theme.medals.achievement.locked,
        }[rarity];

        const filename = "advent_22" + ACHIEVEMENT_RARITY_SUFFIX[rarity];

        await addAchievement(
            ctx,
            colorFill,
            filename,
            positionXY.crtX,
            positionXY.crtY,
            true
        );
    }

    // TODO stat
    //positionXY.crtX += SPACING_ACHIEVEMENTS;
    //const event = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/event.png'));
    //ctx.drawImage(event, crtX, crtY, 40, 40);

    // - Enigme ❓
    //positionXY.crtX += SPACING_ACHIEVEMENTS;
    // TODO manuellement
    //const question = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/question.png'));
    //ctx.drawImage(question, crtX, crtY, 40, 40);

    // - Easter egg 🥚
    //positionXY.crtX += SPACING_ACHIEVEMENTS;
    // TODO
    //const egg = await Canvas.loadImage(path.join(__dirname, '../../data/img/achievements/egg.png'));
    //ctx.drawImage(egg, crtX, crtY, 40, 40);

    return canvas.toBuffer("image/png");
}

/**
 * Add achievements (shadow and background)
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} colorFill Background color
 * @param {String} filename filename for the achievement
 * @param {Number} crtX current position X
 * @param {Number} crtY current position Y
 * @param {Boolean} [event = false] if event achievement
 */
async function addAchievement(ctx, colorFill, filename, crtX, crtY, event = false) {
    // Shadow
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = colorFill;
    roundRect(ctx, crtX + 3, crtY - 2, 60, 60, 10, true, false);

    // Background
    ctx.globalAlpha = 1;
    roundRect(ctx, crtX, crtY - 5, 60, 60, 10, true, false);

    // Achievement
    const achievementPath = event
        ? path.join(
            __dirname,
            `../../data/img/achievements/event/${filename}.png`,
        )
        : path.join(
            __dirname,
            `../../data/img/achievements/${filename}.png`,
        );

    const achievement = await Canvas.loadImage(achievementPath);
    ctx.drawImage(achievement, crtX + 5, crtY, 50, 50);
}

/**
 * Add achievements by rarity
 * @param {CanvasRenderingContext2D} ctx 
 * @param {*} positionXY current position X & Y
 * @param {Number} progressValue progress value of stats user
 * @param {*} thresholds thresholds for the different rarity levels of achievements
 * @param {String} baseFilename filename for the achievement
 * @param {String} theme name of the theme
 */
async function addAchievementByRarity(ctx, positionXY, progressValue, thresholds, baseFilename, theme) {
    const rarity = getAchievementRarity(progressValue, ...thresholds);

    const colorFill = {
        platinum: theme.medals.achievement.platinum,
        gold: theme.medals.achievement.gold,
        silver: theme.medals.achievement.silver,
        bronze: theme.medals.achievement.bronze,
        locked: theme.medals.achievement.locked,
    }[rarity];

    const filename = rarity === "locked" ? "locked" : baseFilename + ACHIEVEMENT_RARITY_SUFFIX[rarity];

    addAchievement(ctx, colorFill, filename, positionXY.crtX, positionXY.crtY);
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

/**
 * Draw a flag
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} countryCode The ISO 3166-1-alpha-2 code of a country
 * @param {Number} x The bottom left x coordinate
 * @param {Number} y The bottom left y coordinate
 * @param {Number} width The width of the flag
 * @param {Number} height The height of the flag
 * @returns True if the flag was successfully drawn, false otherwise
 */
async function drawFlag(ctx, countryCode, x, y, width, height) {
    const code = countryCode.toLowerCase();

    const svgPath = path.join(
        __dirname,
        `../../node_modules/flag-icons/flags/4x3/${code}.svg`,
    );

    try {
        const pngBuffer = await sharp(svgPath)
            .resize(width, height)
            .png()
            .toBuffer();

        const flag = await Canvas.loadImage(pngBuffer);

        ctx.save();

        // Shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // Coins arrondis
        const radius = 5;

        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius, false, true);
        ctx.clip();

        ctx.drawImage(flag, x, y, width, height);

        ctx.restore();

        return true;
    } catch (error) {
        logger.error(`Impossible de charger le drapeau "${code}"`);
        logger.error(error);

        return false;
    }
}

module.exports = {
    renderProfile,
};