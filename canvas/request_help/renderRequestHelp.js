const Canvas = require("canvas");
const path = require("node:path");
const { User } = require("../../models");

const COLORS = {
    background: "#151e32",
    textPrimary: "#FFFFFF",
    textSecondary: "#DDEEDD",
    accent: "#ACD2AC",
    separator: ["transparent", "#6366f1", "transparent"],
};

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;

async function renderRequestHelp(pseudo, gameName, nbPlayers, imageUrl) {
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
    const canvas = Canvas.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    // ---------------
    // BACKGROUND
    // ---------------
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    //ctx.save();

    // ---------------
    // GAME IMAGE
    // ---------------
    const gameImage = await Canvas.loadImage(imageUrl);

    ctx.drawImage(gameImage, 75, 142, 460, 215); // image size : 460x215

    // ---------------
    // RIGHT SIDE
    // ---------------
    const rightSideX = 650;
    // ---------------
    // GAME NAME
    // ---------------
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = "600 42px Oxanium"; // "bold 42px Arial"
    ctx.fillText(`${gameName}`, rightSideX - 40, 115, 525);

    // ---------------
    // NB PLAYER
    // ---------------
    if (nbPlayers) {
        ctx.fillStyle = COLORS.accent;
        ctx.font = "bold 35px Arial";
        ctx.fillText(
            `${nbPlayers} ${nbPlayers > 1 ? "joueurs recherchés" : "joueur recherché"}`,
            rightSideX,
            210,
            490,
        );

        // ctx.fillStyle = COLORS.textSecondary;
        // ctx.font = "25px Arial";
        // ctx.fillText(nbPlayers > 1 ? "joueurs recherchés" : "joueur recherché", rightSideX, 355);
    }

    // ---------------
    // AUTOR
    // ---------------
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = "25px Arial";
    ctx.fillText("Demande par", rightSideX, 305);

    ctx.fillStyle = COLORS.accent;
    ctx.font = "bold 35px Arial";
    ctx.fillText(`${pseudo}`, rightSideX, 350, 485);

    // ---------------
    // SEPARATOR
    // ---------------
    const HEIGHT_SEPARATOR = 500;

    const separator = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    separator.addColorStop(0, COLORS.separator[0]);
    separator.addColorStop(0.5, COLORS.separator[1]);
    separator.addColorStop(1, COLORS.separator[2]);

    ctx.fillStyle = separator;
    ctx.fillRect(50, HEIGHT_SEPARATOR, CANVAS_WIDTH - 100, 1);

    return canvas.toBuffer("image/png");
}

module.exports = {
    renderRequestHelp,
};
