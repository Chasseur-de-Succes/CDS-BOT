const { Client, GatewayIntentBits } = require("discord.js");
const { loadSlashCommands, loadEvents } = require("./util/loader");
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
loadSlashCommands(client);
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
process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
    sendStackTrace(client, error, "Erreur Non Gérée");
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    sendStackTrace(client, error, "Exception Non Capturée");
});
