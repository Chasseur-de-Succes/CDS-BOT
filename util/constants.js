const moment = require("moment");

const MESSAGES = {
    COMMANDS: {
        MISC: {
            HELP: {
                name: "help",
                aliases: ["h"],
                category: "misc",
                cooldown: 0,
                description: "Affiche toutes les commandes disponibles pour votre niveau de permission",
                usage: '[command]'
            },
            INFO: {
                name: "info",
                aliases: ["bot", "botinfo"],
                category: "misc",
                cooldown: 0,
                description: "Afficher des informations sur le bot",
                usage: "",
            },
            PING: {
                name: "ping",
                aliases: [],
                category: "misc",
                cooldown: 0,
                description: "Pong!",
                usage: ""
            },
            SERVERINFO: {
                name: "serverinfo",
                aliases: ["si"],
                category: 'misc',
                cooldown: 0,
                description: "Affiche des informations sur le serveur",
                usage: ""
            },
            REGISTER: {
                name: "register",
                aliases: [],
                category: 'misc',
                cooldown: 0,
                description: "Création de son \"compte\" sur le bot",
                usage: ""
            },
            UPTIME: {
                name: "uptime",
                aliases: ["up"],
                category: "misc",
                cooldown: 0,
                description: "Affiche le temps d'exécution du bot",
                usage: ""
            },
            USER: {
                name: "user",
                aliases: ["userinfo"],
                category: "misc",
                cooldown: 0,
                description: "Affiche des informations sur un utilisateur",
                usage: '<user_mention | user_id>'
            },
            STEAM: {
                name: "steam",
                aliases: [],
                category: "misc",
                cooldown: 0,
                description: "",
                usage: "steam <game name>"
            }
        },
        ADMIN: {
            EVAL: {
                name: "eval",
                aliases: [""],
                category: "admin",
                cooldown: 3,
                //permission: true,
                description: "Renvoie un code javascript testé",
                usage: ""
            }
        },
        CDS: {
            SEARCHGROUP: {
                name: "searchgroup",
                aliases: ["sg"],
                category: "cds",
                cooldown: 0,
                description: "",
                usage: "help"
            }
        },
        ECONOMY: {
            MONEY: {
                name: "money",
                aliases: ["balance", "wallet"],
                category: "economy",
                cooldown: 0,
                description: "Voir son argent",
                usage: ""
            },
            SHOP: {
                name: "shop",
                aliases: ["boutique"],
                category: "economy",
                cooldown: 0,
                description: "Affiche la boutique",
                usage: '[buy] [quantité] [item]'
            }
        },
        MODERATION: {
            KICK: {
                name: "kick",
                aliases: [],
                category: "moderation",
                cooldown: 0,
                description: "Kick un utilisateur",
                usage: ""
            },
            BAN: {
                name: "ban",
                aliases: [],
                category: "moderation",
                cooldown: 0,
                description: "Ban un utilisateur",
                usage: ""
            },
            UNBAN: {
                name: "unban",
                aliases: [],
                category: "moderation",
                cooldown: 0,
                description: "Annuler un ban d'un utilisateur",
                usage: ""
            },
            MUTE: {
                name: "mute",
                aliases: [],
                category: "moderation",
                cooldown: 0,
                description: "Mute un utilisateur",
                usage: ""
            },
            UNMUTE: {
                name: "unmute",
                aliases: [],
                category: "moderation",
                cooldown: 0,
                description: "Unmute un utilisateur",
                usage: ""
            },
            PURGE: {
                name: "purge",
                aliases: ["clean"],
                category: "moderation",
                cooldown: 0,
                description: "Purge un channel de ses X derniers messages.",
                usage: ""
            },
            REFRESHGAMES: {
                name: "refreshgames",
                aliases: ["rg"],
                category: "moderation",
                cooldown: 0,
                description: "",
                usage: "refreshGames"
            }
        }
    }
}

const NB_MAX = {
    GROUP: {
        MEMBER: 15,
        CHARNAME: 25
    }
}

// TODO a revoir ?
const TAGS = {
    MULTI: {id: 1, description: "Multi-player"},
    // ONLINE_COOP: {id: 38, description: 'Online Co-op'},
    COOP: {id: 9, description: "Co-op"},
    ACHIEVEMENTS: {id: 22, description: "Steam Achievements"}
}

// TODO a deplacé autre part ? methodes
// attends ms milliseconds
const delay = ms => new Promise(res => setTimeout(res, ms));
const crtHour = () => moment().format("HH[h]mm[:]ss");

exports.MESSAGES = MESSAGES;
exports.NB_MAX = NB_MAX;
exports.TAGS = TAGS;
exports.delay = delay;
exports.crtHour = crtHour;