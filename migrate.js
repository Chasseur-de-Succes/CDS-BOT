const mongoose = require("mongoose");
const { Model } = require("objection");
require("dotenv").config();

// Initialiser Knex
const Knex = require("knex");
const knexConfig = require("./knexfile");
const knex = Knex(knexConfig);
Model.knex(knex);

// Modèles Objection.js
const {
    User,
    Stats,
    GuildConfig,
    MessageClue,
    ClueField,
    Tower,
    TowerBoss,
    TowerStats,
    Job,
} = require("./models/objection");
const {
    User: UserMG,
    GuildConfig: GuildConfigMG,
    TowerBoss: TowerBossMG,
    Job: JobMG,
} = require("./models");
const constants = require("./data/event/tower/constants.json");

const ANSI = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
};

const logStep = (section, message, level = "info") => {
    const isNoColor =
        process.env.NO_COLOR === "1" || process.env.NO_COLOR === "true";
    if (isNoColor) {
        console.log(`[MIGRATE][${section}] ${message}`);
        return;
    }

    const colorByLevel = {
        info: ANSI.cyan,
        success: ANSI.green,
        warn: ANSI.yellow,
        error: ANSI.red,
    };

    const levelColor = colorByLevel[level] || ANSI.cyan;
    console.log(
        `${ANSI.dim}[MIGRATE]${ANSI.reset}${levelColor}[${section}]${ANSI.reset} ${message}`,
    );
};

async function truncateAllTables() {
    const tables = [
        "TowerBoss",
        "TowerStats",
        "Tower",
        "ClueField",
        "MessageClue",
        "Stats",
        "Job",
        "GuildConfig",
        "User",
    ];

    try {
        logStep("TRUNCATE", `Début du vidage de ${tables.length} tables`);

        // Désactiver les contraintes de clés étrangères temporairement
        await knex.raw("BEGIN");

        for (const table of tables) {
            await knex.raw(`TRUNCATE TABLE "${table}" CASCADE`);
        }

        await knex.raw("COMMIT");
        logStep(
            "TRUNCATE",
            "Toutes les tables ont été vidées avec succès",
            "success",
        );
    } catch (error) {
        logStep(
            "TRUNCATE",
            `Erreur lors du vidage des tables: ${error.message}`,
            "error",
        );
        await knex.raw("ROLLBACK");
        throw error;
    }
}

async function migrate() {
    // 1. Connexion à MongoDB
    // 2. Récupérer les données depuis MongoDB
    // 3. Insérer dans PostgreSQL
    const mongOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
        autoIndex: false, // Don't build indexes
        poolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
    };
    await mongoose.connect(process.env.DBCONNECTION, mongOptions);
    logStep("INIT", "Connexion MongoDB OK");

    // vide la bdd
    await truncateAllTables();

    // USERS
    logStep("USERS", "Récupération des utilisateurs MongoDB");
    let users = await UserMG.find();
    let usersIds = [];
    logStep("USERS", `${users.length} utilisateur(s) à migrer`);
    for (const [index, user] of users.entries()) {
        let userId = await User.query()
            .insert({
                discordId: user.userId,
                steamId: user.steamId,
                username: user.username,
                xp: user.experience,
                level: user.level,
                money: user.money,
                banned: user.banned,
                blacklisted: user.blacklisted,
                moneyLimit: user.moneyLimit,
                lastBuy: user.lastBuy ? user.lastBuy : null,
                nbWarning: user.warning,
            })
            .returning("id");
        usersIds.push(userId);

        // stats
        // on met la year à null car on a pas l'info
        await Stats.query().insert({
            userId: userId.id,
            nbMsg: user.stats.msg,
            nbGroupCreated: user.stats.group.created,
            nbGroupJoined: user.stats.group.joined,
            nbGroupLeft: user.stats.group.left,
            nbGroupDissolved: user.stats.group.dissolved,
            nbGroupEnded: user.stats.group.ended,
            nbShopSold: user.stats.shop.sold,
            nbShopBought: user.stats.shop.bought,
            nbHero: user.stats.img.heros,
            nbZero: user.stats.img.zeros,
        });

        // tower stats, histo et current
        // seulement saison 0 normalement !!
        if (user.event.tower.seasonHistory) {
            for (const event of user.event.tower.seasonHistory) {
                let towerStatsId = await TowerStats.query()
                    .insert({
                        userId: userId.id,
                        season: event.season,
                        startDate: event.startDate,
                        nbValidatedGames: event.maxEtage,
                        totalDamage: event.totalDamage,
                    })
                    .returning("id");
            }
        }
        // si saison courante
        if (user.event.tower.startDate) {
            let towerStatsId = await TowerStats.query()
                .insert({
                    userId: userId.id,
                    season: user.event.tower.seasonNumber,
                    startDate: user.event.tower.startDate,
                    nbValidatedGames: user.event.tower.etage,
                    currentFloor: user.event.tower.currentEtage,
                    totalDamage: user.event.tower.totalDamage,
                    completedGames: user.event.tower.completedGames,
                })
                .returning("id");
        }

        if ((index + 1) % 100 === 0 || index === users.length - 1) {
            logStep(
                "USERS",
                `${index + 1}/${users.length} utilisateur(s) migré(s)`,
            );
        }
    }

    // GUILD CONFIG
    logStep("GUILD", "Récupération des configurations serveur");
    let guildConfigs = await GuildConfigMG.find();
    logStep("GUILD", `${guildConfigs.length} configuration(s) à migrer`);
    for (const gc of guildConfigs) {
        logStep("GUILD", `Migration de la config pour ${gc.guildId}`);
        // guildconfig
        await GuildConfig.query()
            .insert({
                guildId: gc.guildId,
                channelWelcome: gc.channels["welcome"],
                channelListGroup: gc.channels["list_group"],
                channelHeros: gc.channels["hall_heros"],
                channelZeros: gc.channels["hall_zeros"],
                channelLogs: gc.channels["logs"],
                channelCreateVocal: gc.channels["create_vocal"],
                channelCatGroup: gc.channels["cat_discussion_groupe"],
                channelCatGroup2: gc.channels["cat_discussion_groupe_2"],
                channelFeed: gc.channels["feed_bot"],
                channelFeedAchievement: gc.channels["feed_achievement"],
                channelTickets: gc.channels["tickets"],
                channelEventTower: gc.channels["event_tower"],
                channelVoice: gc.voice_channels,
                webhook: gc.webhook["feed_achievement"],
            })
            .onConflict("guildId")
            .ignore();

        // Message Clue & Clue Field
        const genres = constants.MONTHLY.GENRES;
        const tags = constants.MONTHLY.TAGS;
        const clues = constants.MONTHLY.CLUES;
        const messagesClue = [];
        // d'abord le MessageClue
        // créer MessageClue pour chaque mois avec idMsg null du coup
        for (let i = 0; i < 12; i++) {
            messagesClue.push({
                month: i,
                description: clues[i],
            });
        }
        let messagesClueId = await MessageClue.query()
            .insert(messagesClue)
            .returning("id");

        let clueFieldsId = [];
        for (const element of messagesClueId) {
            const month = element.month;
            const messageClueId = element.id;
            const clueFields = [];
            for (const genre of genres[month]) {
                clueFields.push({
                    idMsgClue: messageClueId,
                    name: genre.label,
                    value: genre.id,
                    type: "genre",
                });
            }
            for (const tag of tags[month]) {
                clueFields.push({
                    idMsgClue: messageClueId,
                    name: tag.label,
                    value: tag.id,
                    type: "tag",
                });
            }
            clueFieldsId = await ClueField.query()
                .insert(clueFields)
                .returning("id");
        }

        // tower
        if (gc.event?.tower) {
            let idCrtTower = null;
            const tower = gc.event.tower;
            if (tower.history) {
                for (const history of tower.history) {
                    await Tower.query().insert({
                        guildId: gc.guildId,
                        season: history.season,
                        start: history.startDate,
                        finish: history.endDate,
                        finished: history.finished,
                    });
                }
            }
            if (tower.started) {
                idCrtTower = await Tower.query()
                    .insert({
                        guildId: gc.guildId,
                        season: tower.currentSeason,
                        start: tower.startDate,
                        started: tower.started,
                        msgClueId: tower.msgClueId,
                    })
                    .returning("id");
            }

            if (idCrtTower) {
                await Tower.query()
                    .where({
                        id: idCrtTower.id,
                    })
                    .patch({
                        msgClueId:
                            messagesClueId[tower.currentMsgClue.month].id,
                    });
            }

            if (tower.currentMsgClue.fields.length > 0) {
                // maj MessageClue mois courant
                await MessageClue.query()
                    .where({
                        id: messagesClueId[tower.currentMsgClue.month].id,
                    })
                    .patch({
                        idMsg: tower.currentMsgClue.id,
                    });

                // maj ClueField mois courant
                for (const field of tower.currentMsgClue.fields) {
                    let found = field.found;
                    let idTagGenre = field.id;

                    await ClueField.query()
                        .where({
                            idMsgClue:
                                messagesClueId[tower.currentMsgClue.month].id,
                            value: idTagGenre,
                        })
                        .patch({
                            found: found,
                        });
                }
            }

            // TOWER BOSSES
            let insertedTowerBosses = 0;
            let skippedTowerBosses = 0;
            let towerBosses = await TowerBossMG.find().populate("killedBy");
            for (const boss of towerBosses) {
                // recupere l'id de la tour
                let crtTower = await Tower.query().select("id").where({
                    guildId: gc.guildId,
                    season: boss.season,
                });
                // recupere l'id du tueur (s'il existe)
                let killer = await User.query()
                    .select("id")
                    .where({
                        discordId: boss.killedBy ? boss.killedBy.userId : null,
                    });

                if (crtTower.length > 0) {
                    // recupere l'id de l'user (+tard vu que User pas encore migré)
                    await TowerBoss.query().insert({
                        towerId: crtTower[0].id,
                        name: boss.name,
                        hp: boss.hp,
                        maxHp: boss.maxHp,
                        season: boss.season,
                        hidden: boss.hidden,
                        order: boss.ordre,
                        killedBy: killer.length > 0 ? killer[0].id : null,
                    });
                    insertedTowerBosses++;
                } else {
                    skippedTowerBosses++;
                }
            }
            logStep(
                "TOWER_BOSS",
                `Guild ${gc.guildId}: ${insertedTowerBosses} boss migré(s), ${skippedTowerBosses} ignoré(s)`,
            );
        }
    }
    logStep("GUILD", "Migration des configurations et tours terminée");

    // JOB
    logStep("JOB", "Récupération des jobs MongoDB");
    let jobs = await JobMG.find();
    let insertedJobs = 0;
    for (const job of jobs) {
        await Job.query().insert({
            name: job.name,
            guildId: job.guildId,
            when: job.when,
            functionName: job.what,
            args: job.args,
            pending: job.pending,
        });
        insertedJobs++;
    }
    logStep("JOB", `${insertedJobs} job(s) migré(s)`);

    logStep("DONE", "Migration terminée", "success");
    await knex.destroy();
}

migrate().catch((error) => {
    logStep("FATAL", error?.stack || error?.message || String(error), "error");
});

// // Insérer l'utilisateur
// const [userId] = await knex('users')
//     .insert({
//         id: user._id.toString(),
//         name: user.name,
//         created_at: user.created_at || new Date(),
//     })
//     .returning('id');
//
// // Insérer les commandes (si elles existent)
// if (user.orders) {
//     for (const order of user.orders) {
//         await knex('orders').insert({
//             user_id: userId,
//             product: order.product,
//             price: order.price,
//         });
//     }
// }
