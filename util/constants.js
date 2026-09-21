const moment = require("moment");

const DAILY_MONEY_LIMIT = 50;

const NB_MAX = {
    GROUP: {
        MEMBER: 15,
        CHARNAME: 25,
    },
};

// TODO a revoir ?
const TAGS = {
    MULTI: { id: 1, description: "Multi-player" },
    // ONLINE_COOP: {id: 38, description: 'Online Co-op'},
    COOP: { id: 9, description: "Co-op" },
    ACHIEVEMENTS: { id: 22, description: "Steam Achievements" },
};

// TODO a deplacé autre part ? methodes
// attends ms milliseconds
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const crtHour = () => moment().format("HH[h]mm[:]ss");

const BAREME_XP = {
    MSG: 5,
    CAPTAIN: 15,
    EVENT_END: 25,
};
const THREESOLD_LVL = 100;
const BAREME_MONEY = {
    MSG: 5,
};

const CHANNEL = [
    {
        name: "Salon de bienvenue",
        value: "Welcome", // channel de bienvenue, affiche les nouveaux arrivants
    },
    {
        name: "Salon qui liste les groupes",
        value: "ListGroup", // channel qui affichera tous les groupes
    },
    {
        name: "Salon du hall des héros",
        value: "Heros", // channel eponyme (pour stat)
    },
    {
        name: "Salon du hall des zéros",
        value: "Zeros", // channel eponyme (pour stat)
    },
    {
        name: "Salon de logs (admin)",
        value: "Logs", // channel de logs (discord: join, leave, modification surnom,...)
    },
    {
        name: "Catégorie des discussions de groupe",
        value: "CatGroup",
    },
    {
        name: "Catégorie des discussions de groupe 2",
        value: "CatGroup2",
    },
    {
        name: "Feed bot 🤖",
        value: "Feed",
    },
    {
        name: "Feed achievement 🆕",
        value: "FeedAchievement",
    },
    {
        name: "Salon de tickets",
        value: "Tickets",
    },
    {
        name: "Événement Tower",
        value: "EventTower",
    },
];
const SALON = {
    WELCOME: "welcome",
    ROLE: "role",
    LIST_GROUP: "list_group",
    HALL_HEROS: "hall_heros",
    HALL_ZEROS: "hall_zeros",
    LOGS: "logs",
    CAT_DISCUSSION_GROUPE: "cat_discussion_groupe",
    CAT_DISCUSSION_GROUPE_2: "cat_discussion_groupe_2",
    FEED_BOT: "feed_bot",
    FEED_ACHIEVEMENT: "feed_achievement",
    TICKETS: "tickets",
    EVENT_TOWER: "event_tower",
};
const NEW_SALON = {
    WELCOME: "channelWelcome",
    LIST_GROUP: "channelListGroup",
    HALL_HEROS: "channelHeros",
    HALL_ZEROS: "channelZeros",
    LOGS: "channelLogs",
    CAT_DISCUSSION_GROUPE: "channelCatGroup",
    CAT_DISCUSSION_GROUPE_2: "channelCatGroup2",
    FEED_BOT: "channelFeed",
    FEED_ACHIEVEMENT: "channelFeedAchievement",
    TICKETS: "channelTickets",
    EVENT_TOWER: "channelEventTower",
    CREATE_VOCAL: "channelCreateVocal",
};

const WEBHOOK_ARRAY = [
    {
        name: "Webhook succès",
        value: "feed_achievement", // channel de bienvenue, affiche les nouveaux arrivants
    },
];
const WEBHOOK = {
    FEED_ACHIEVEMENT: "feed_achievement",
};

const MIN_PRICE_SHOP = 1000; // Prix minimum pour les jeux du shop

exports.DAILY_MONEY_LIMIT = DAILY_MONEY_LIMIT;
exports.NB_MAX = NB_MAX;
exports.TAGS = TAGS;
exports.BAREME_XP = BAREME_XP;
exports.BAREME_MONEY = BAREME_MONEY;
exports.THREESOLD_LVL = THREESOLD_LVL;
exports.delay = delay;
exports.crtHour = crtHour;
exports.CHANNEL = CHANNEL;
exports.SALON = SALON;
exports.NEW_SALON = NEW_SALON;
exports.WEBHOOK_ARRAY = WEBHOOK_ARRAY;
exports.WEBHOOK = WEBHOOK;
exports.MIN_PRICE_SHOP = MIN_PRICE_SHOP;
