const moment = require("moment");
//const { MONEY } = require("../config");

const MESSAGES = {
    COMMANDS: {
        ADMIN: {
            EVAL: {
                name: "eval",
                aliases: [],
                category: "admin",
                cooldown: 3,
                //permission: true,
                description: "Renvoie un code javascript testé",
                usage: ""
            },
            DISSOLVEGROUP: {
                name: "dissolvegroup",
                aliases: ["disolvegroup"],
                category: "admin",
                cooldown: 3,
                //permission: true,
                description: "Dissout un groupe",
                usage: ""
            },
            LEAVEGROUP: {
                name: "leavegroup",
                aliases: [],
                category: "admin",
                cooldown: 3,
                //permission: true,
                description: "Force un membre à quitter un groupe",
                usage: ""
            },
            BLACKLISTUSER: {
                name: "blacklistuser",
                aliases: [],
                category: "admin",
                cooldown: 3,
                //permission: true,
                description: "Blackliste un utilisateur. L'empêche de rejoindre ",
                usage: ""
            },
            WHITELISTCHANNEL: {
                name: "whitelistchannel",
                aliases: [],
                category: "admin",
                cooldown: 3,
                //permission: true,
                description: "Whitelist un channel pour permettre d'y effectuer des commandes ou le retire de la whitelist",
                usage: "<add | remove | list> [<#mention-channel>]"
            },
            ROLE: {
                // TODO voir si utile..
                name: "role",
                aliases: [],
                category: "admin",
                cooldown: 5,
                description: "Commande pour modifier un rôle",
                args: [
                    {
                        name: 'create',
                        type: 'SUB_COMMAND',
                        description: 'Créer un nouveau rôle, avec un nouveau channel accessible via ce rôle',
                        options: [
                            { 
                                name: 'nom',
                                type: 'STRING',
                                description: 'Nom du rôle',
                                required: true,
                            }, { 
                                name: 'emoji',
                                type: 'STRING',
                                description: 'Emoji lié à ce rôle (sera utilisé dans le channel des rôles)',
                                required: true,
                            }
                        ]
                    }, {
                        name: 'delete',
                        type: 'SUB_COMMAND',
                        description: 'Supprimer un rôle et le channel associé',
                        options: [
                            { 
                                name: 'role',
                                type: 'ROLE',
                                description: 'Le rôle à supprimer (doit avoir été créé via la commande avant)',
                                required: true,
                            }
                        ]
                    }
                ],
                userperms: ['ADMINISTRATOR']
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

const BAREME_XP = {
    MSG: 5,
    CAPTAIN: 15,
    EVENT_END: 25,
}
const THREESOLD_LVL = 100;
const BAREME_MONEY = {
    MSG: 5
}

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
        name: 'Salon de bienvenue',
        value: 'welcome' // channel de bienvenue, affiche les nouveaux arrivants
    }, { 
        name: 'Salon choix de rôle (cf /role)',
        value: 'role' // channel où l'on peut choisir ses rôles, ne doit contenir qu'un seul message : celui du bot qui est créé automatiquement
    }, { 
        name: 'Salon qui liste les groupes',
        value: 'list_group' // channel qui affichera tous les groupes
    }, { 
        name: 'Salon du hall des héros',
        value: 'hall_heros' // channel eponyme (pour stat)
    }, { 
        name: 'Salon du hall des zéros',
        value: 'hall_zeros' // channel eponyme (pour stat)
    }, { 
        name: 'Salon de logs (admin)',
        value: 'logs' // channel de logs (discord: join, leave, modification surnom,...)
    }, {
        name: 'Catégorie des discussions de groupe',
        value: 'cat_discussion_groupe'
    }, {
        name: 'Catégorie des discussions de groupe 2',
        value: 'cat_discussion_groupe_2'
    }, {
        name: 'Salon "calendrier de l\'avent"',
        value: 'advent'
    },
]
const SALON = {
    WELCOME: 'welcome',
    ROLE: 'role',
    LIST_GROUP: 'list_group',
    HALL_HEROS: 'hall_heros',
    HALL_ZEROS: 'hall_zeros',
    LOGS: 'logs',
    CAT_DISCUSSION_GROUPE: "cat_discussion_groupe",
    CAT_DISCUSSION_GROUPE_2: "cat_discussion_groupe_2",
    ADVENT: "advent"
}

exports.MESSAGES = MESSAGES;
exports.NB_MAX = NB_MAX;
exports.TAGS = TAGS;
exports.BAREME_XP = BAREME_XP;
exports.BAREME_MONEY = BAREME_MONEY;
exports.THREESOLD_LVL = THREESOLD_LVL;
exports.delay = delay;
exports.crtHour = crtHour;
exports.CHANNEL = CHANNEL;
exports.SALON = SALON;