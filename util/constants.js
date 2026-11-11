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

/* const CHANNEL = {
    WELCOME: 'Salon de bienvenue', // channel de bienvenue, affiche les nouveaux arrivants
    ROLE: 'Salon choix de rôle (cf /role)', // channel où l'on peut choisir ses rôles, ne doit contenir qu'un seul message : celui du bot qui est créé automatiquement
    LIST_GROUP: 'Salon qui liste les groupes', // channel qui affichera tous les groupes
    HALL_HEROS: 'Salon du hall des héros', // channel eponyme (pour stat)
    HALL_ZEROS: 'Salon du hall des zéros', // channel eponyme (pour stat)
    LOGS: 'Salon de logs (admin)' // channel de logs (discord: join, leave, modification surnom,...)
} */
const CHANNEL = [
    {
        name: "Salon de bienvenue",
        value: "welcome", // channel de bienvenue, affiche les nouveaux arrivants
    },
    {
        name: "Salon choix de rôle (cf /role)",
        value: "role", // channel où l'on peut choisir ses rôles, ne doit contenir qu'un seul message : celui du bot qui est créé automatiquement
    },
    {
        name: "Salon qui liste les groupes",
        value: "list_group", // channel qui affichera tous les groupes
    },
    {
        name: "Salon du hall des héros",
        value: "hall_heros", // channel eponyme (pour stat)
    },
    {
        name: "Salon du hall des zéros",
        value: "hall_zeros", // channel eponyme (pour stat)
    },
    {
        name: "Salon de logs (admin)",
        value: "logs", // channel de logs (discord: join, leave, modification surnom,...)
    },
    {
        name: "Catégorie des discussions de groupe",
        value: "cat_discussion_groupe",
    },
    {
        name: "Catégorie des discussions de groupe 2",
        value: "cat_discussion_groupe_2",
    },
    {
        name: "Feed bot 🤖",
        value: "feed_bot",
    },
    {
        name: "Feed achievement 🆕",
        value: "feed_achievement",
    },
    {
        name: "Salon de tickets",
        value: "tickets",
    },
    {
        name: "Événement Tower",
        value: "event_tower",
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

// Discord limites
// https://support.discord.com/hc/fr/articles/33694251638295-Plafonds-de-compte-Discord-plafonds-de-serveur-et-plus
const DISCORD_LIMITS = {
    CHOICES_PER_AUTOCOMPLETE: 25,

    // Roles
    ROLES_PER_GUILD: 250,
    ROLE_MAX_LENGTH: 100,

    // Channels
    CHANNELS_PER_GUILD: 500,
    CATEGORIES_PER_GUILD: 50,
    CHANNELS_PER_CATEGORY: 50,
    PINS_PER_CHANNEL: 250,

    // Messages
    MESSAGE_CONTENT: 2000,
    EMBEDS_PER_MESSAGE: 10,

    // Embeds
    EMBED_TOTAL_MAX_LENGTH: 6000,
    EMBED_TITLE_MAX_LENGTH: 256,
    EMBED_DESCRIPTION_MAX_LENGTH: 4096,
    EMBED_FIELDS: 25,
    EMBED_FIELD_NAME_MAX_LENGTH: 256,
    EMBED_FIELD_VALUE_MAX_LENGTH: 1024,
    EMBED_FOOTER_MAX_LENGTH: 2048,
};

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
exports.WEBHOOK_ARRAY = WEBHOOK_ARRAY;
exports.WEBHOOK = WEBHOOK;
exports.MIN_PRICE_SHOP = MIN_PRICE_SHOP;
exports.DISCORD_LIMITS = DISCORD_LIMITS;
