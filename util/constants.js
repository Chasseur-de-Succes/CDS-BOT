const moment = require("moment");
const { MONEY } = require("../config");

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
            PROFILE: {
                name: "profile",
                aliases: ["profil"],
                category: "misc",
                cooldown: 3,
                description: "Affiche votre profil",
                usage: "[<user mention | user id>]",
                args: [
                    { 
                        name: 'user',
                        type: 'USER',
                        description: 'Affiche le profil d\'un utilisateur',
                        required: false,
                    },
                ]
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
                description: "Création d'un compte CDS",
                usage: "",
                args: [
                    { 
                        name: 'id-steam-64',
                        type: 'STRING',
                        description: 'ID Steam 64 (trouvable ici steamid.xyz/)',
                        required: true,
                    },
                ]
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
                description: "Affiche des informations sur vous",
                usage: '<user_mention | user_id>',
                args: [
                    { 
                        name: 'user',
                        type: 'USER',
                        description: 'Affiche des informations sur un utilisateur',
                        required: false,
                    },
                ]
            }
        },
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
            GIVEMONEY: {
                name: "givemoney",
                aliases: [],
                category: "admin",
                cooldown: 5,
                //permission: true,
                description: "Donne ou retire à l'utilisateur mentionné, un montant d'argent",
                usage: "<user> <montant>",
                args: [
                    { 
                        name: 'user',
                        type: 'USER',
                        description: 'Utilisateur qui reçoit l\'argent',
                        required: true,
                    }, { 
                        name: 'money',
                        type: 'INTEGER',
                        description: 'Montant à donner ou à retirer',
                        required: true,
                    }
                ],
                userperms: ['ADMINISTRATOR']
            },
            ROLE: {
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
        CDS: {
            GROUP: {
                name: "group",
                aliases: [],
                category: "cds",
                cooldown: 0,
                description: "Commande pour gérer les groupes",
                usage: "help",
                args: [
                    {
                        name: 'create',
                        type: 'SUB_COMMAND',
                        description: 'Créer un nouveau groupe, sur un jeu Steam',
                        options: [
                            { 
                                name: 'nom',
                                type: 'STRING',
                                description: 'Nom du groupe',
                                required: true,
                            }, { 
                                name: 'max',
                                type: 'INTEGER',
                                description: 'Nombre max de membres dans le groupe',
                                required: true,
                            }, { 
                                name: 'jeu',
                                type: 'STRING',
                                description: 'Nom du jeu',
                                autocomplete: true,
                                required: true,
                            }, { 
                                name: 'description',
                                type: 'STRING',
                                description: 'Description du groupe, quels succès sont rechercher, spécificités, etc',
                                required: false,
                            }
                        ]
                    }, {
                        name: 'schedule',
                        type: 'SUB_COMMAND',
                        description: 'Planifie une date pour un groupe. Un rappel sera envoyé aux membres 1j et 1h avant',
                        options: [
                            { 
                                name: 'nom',
                                type: 'STRING',
                                description: 'Nom du groupe',
                                required: true,
                            }, { 
                                name: 'jour',
                                type: 'STRING',
                                description: 'Jour de l\'événement, au format DD/MM/YY',
                                required: true,
                            }, { 
                                name: 'heure',
                                type: 'STRING',
                                description: 'Heure de l\'événement, au format HH:mm',
                                required: true,
                            }
                        ]
                    }, {
                        name: 'dissolve',
                        type: 'SUB_COMMAND',
                        description: 'Dissoud un groupe et préviens les membres de celui-ci (👑 only)',
                        options: [
                            { 
                                name: 'nom',
                                type: 'STRING',
                                description: 'Nom du groupe',
                                required: true,
                            }
                        ]
                    }, {
                        name: 'transfert',
                        type: 'SUB_COMMAND',
                        description: 'Transfert le statut de 👑capitaine à un autre membre du groupe (👑 only)',
                        options: [
                            { 
                                name: 'nom',
                                type: 'STRING',
                                description: 'Nom du groupe',
                                required: true,
                            }, { 
                                name: 'membre',
                                type: 'USER',
                                description: 'Membre du groupe, deviendra le nouveau capitaine',
                                required: true,
                            }
                        ]
                    }, {
                        name: 'end',
                        type: 'SUB_COMMAND',
                        description: 'Valide et termine un groupe (👑 only)',
                        options: [
                            { 
                                name: 'nom',
                                type: 'STRING',
                                description: 'Nom du groupe',
                                required: true,
                            }
                        ]
                    }
                ],
            }
        },
        ECONOMY: {
            MONEY: {
                name: "money",
                aliases: ["balance", "wallet"],
                category: "economy",
                cooldown: 0,
                description: "Voir son argent",
                usage: "",
                args: [
                    { 
                        name: 'user',
                        type: 'USER',
                        description: 'Porte-monnaie de tel utilisateur',
                        required: false,
                    }
                ],
            },
            SHOP: {
                name: "shop",
                aliases: ["boutique"],
                category: "economy",
                cooldown: 0,
                description: "Affiche la boutique",
                usage: "help",
                args: [
                    {
                        name: 'list',
                        type: 'SUB_COMMAND',
                        description: 'Liste les jeux achetable',
                    },{
                        name: 'jeux',
                        type: 'SUB_COMMAND',
                        description: 'Ouvre le shop (Jeux)',
                        options: [
                            { 
                                name: 'page',
                                type: 'INTEGER',
                                description: 'N° de page du shop',
                                required: false,
                            }, 
                        ]
                    }, { 
                        name: 'custom',
                        type: 'SUB_COMMAND',
                        description: 'Ouvre le shop (personnalisation)',
                        options: [
                            { 
                                name: 'page',
                                type: 'INTEGER',
                                description: 'N° de page du shop',
                                required: false,
                            }, 
                        ]
                    }, {
                        name: 'sell',
                        type: 'SUB_COMMAND',
                        description: 'Vend une clé Steam',
                        options: [
                            { 
                                name: 'jeu',
                                type: 'STRING',
                                description: 'Nom du jeu',
                                required: true,
                            }, { 
                                name: 'prix',
                                type: 'INTEGER',
                                description: 'Prix du jeu (en ' + MONEY + ')',
                                required: true,
                            }
                        ]
                    }, {
                        name: 'admin',
                        type: 'SUB_COMMAND_GROUP',
                        description: 'Gestion des items du shop',
                        options: [
                            {
                                name: 'cancel',
                                type: 'SUB_COMMAND',
                                description: 'Annule une transaction **en cours**',
                                options: [
                                    {
                                        name: 'id',
                                        type: 'STRING',
                                        description: 'ID de la transaction (récupéré dans msg log)',
                                        required: true
                                        /* autocomplete: true */
                                    }
                                ],
                            }, {
                                name: 'refund',
                                type: 'SUB_COMMAND',
                                description: 'Rembourse une transaction **terminé**',
                                options: [
                                    {
                                        name: 'id',
                                        type: 'STRING',
                                        description: 'ID de la transaction (récupéré dans msg log)',
                                        required: true
                                        /* autocomplete: true */
                                    }
                                ],
                            }, {
                                name: 'delete',
                                type: 'SUB_COMMAND',
                                description: 'Supprime un item du shop',
                                options: [
                                    {
                                        name: 'vendeur',
                                        type: 'USER',
                                        description: 'Vendeur',
                                        required: true
                                    }, {
                                        name: 'jeu',
                                        type: 'STRING',
                                        description: 'Nom du jeu',
                                        autocomplete: true,
                                        required: true
                                    },
                                ],
                            }
                        ]
                    }
                ]
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