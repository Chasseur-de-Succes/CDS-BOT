const { Client, GatewayIntentBits } = require("discord.js");
const {
    loadCommands,
    loadEvents,
    loadBatch,
    loadReactionGroup,
    loadReactionMsg,
    loadVocalCreator,
} = require("./util/loader");
const { sendStackTrace } = require("./util/envoiMsg");
const winston = require("winston");
require("winston-daily-rotate-file");
require("dotenv").config();

const transport = new winston.transports.DailyRotateFile({
    filename: "logs/app-%DATE%.log",
    datePattern: "YYYY-MM-DD-HH",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
});
global.logger = winston.createLogger({
    transports: [
        transport,
        new winston.transports.Console({
            level: "silly",
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ],
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
    ),
});
require("date.format");

const client = new Client({
    intents: [
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
});
require("./util/functions")(client);
require("./util/steam")(client);

client.mongoose = require("./util/mongoose");

// SLASH COMMAND
loadCommands(client);
// EVENTS
loadEvents(client);

// MONGO DB
client.mongoose.init();

client.on("error", console.error);
client.on("warn", console.warn);

client.login(process.env.TOKEN).then((c) => {
    //loadBatch(client);
    //loadReactionGroup(client);
});


// Gestion erreurs
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    sendStackTrace(client, error, 'Erreur Non Gérée');
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    sendStackTrace(client, error, 'Exception Non Capturée');
});

client.once(Events.ClientReady, async () => {
    console.log(`
  oooooooo8 ooooooooo    oooooooo8       oooooooooo    ooooooo   ooooooooooo 
o888     88  888    88o 888               888    888 o888   888o 88  888  88 
888          888    888  888oooooo        888oooo88  888     888     888     
888o     oo  888    888         888       888    888 888o   o888     888     
 888oooo88  o888ooo88   o88oooo888       o888ooo888    88ooo88      o888o    
    `);

    logger.info("Chargement des batchs ..");
    await loadBatch(client);
    logger.info(".. terminé");

    logger.info("Chargement des messages 'events' ..");
    await loadReactionGroup(client);
    logger.info(".. terminé");

    logger.info("Chargement des reactions hall héros/zéros ..");
    await loadReactionMsg(client);
    logger.info(".. terminé");

    logger.info("Chargement du chan vocal créateur ..");
    await loadVocalCreator(client);
    logger.info(".. terminé");

    //   loadRoleGiver(client);
});
