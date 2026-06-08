const achievements = require("../data/achievements.json");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema
        .createTable("GuildConfig", (table) => {
            table.string("guildId", 255).notNullable().unique().primary();
            table.string("channelWelcome", 255);
            table.string("channelListGroup", 255);
            table.string("channelHeros", 255);
            table.string("channelZeros", 255);
            table.string("channelLogs", 255);
            table.string("channelCreateVocal", 255);
            table.string("channelCatGroup", 255);
            table.string("channelCatGroup2", 255);
            table.string("channelFeed", 255);
            table.string("channelFeedAchievement", 255);
            table.string("channelTickets", 255);
            table.string("channelEventTower", 255);
            table.specificType("channelVoice", "varchar(255)[]");
            table.string("webhook", 255);
        })
        .createTable("Game", (table) => {
            table.string("appid", 255).notNullable().unique().primary();
            table.string("iconHash", 255);
            table.text("name").notNullable();
            table.string("type", 255);
            table.boolean("isMulti").notNullable().defaultTo(false);
            table.boolean("isCoop").notNullable().defaultTo(false);
            table.boolean("hasAchievements").notNullable().defaultTo(false);
            table.boolean("isRemoved").notNullable().defaultTo(false);
        })
        .createTable("Achievement", (table) => {
            table.increments("id").primary();
            table
                .string("appid", 255)
                .references("appid")
                .inTable("Game")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table.string("apiName", 255);
            table.string("displayName", 255);
            table.text("description");
            table.string("icon", 255);
            table.string("icongray", 255);
        })
        .createTable("User", (table) => {
            table.increments("id").primary();
            table.string("discordId", 255);
            table.string("steamId", 255);
            table.string("username", 255);
            table.integer("xp").defaultTo(0);
            table.integer("level").defaultTo(1);
            table.integer("money").defaultTo(150);
            table.boolean("banned").defaultTo(false);
            table.boolean("blacklisted").defaultTo(false);
            table.integer("moneyLimit").defaultTo(0);
            table.timestamp("lastBuy");
            table.smallint("nbWarning").defaultTo(0);
        })
        .createTable("GameItemShop", (table) => {
            table.increments("id").primary();
            table.string("guildId", 255);
            table
                .string("game")
                .references("appid")
                .inTable("Game")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table
                .integer("seller")
                .references("id")
                .inTable("User")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table
                .integer("buyer")
                .references("id")
                .inTable("User")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table.integer("price");
            table
                .enu("state", ["listed", "pending", "done"], {
                    useNative: true,
                    enumName: "item_shop_state", // Nom de l'enum dans la base de données
                })
                .notNullable()
                .defaultTo("listed")
        })
        .createTable("Group", (table) => {
            table.increments("id").primary();
            table.string("guildId", 255);
            table.string("name", 255);
            table.text("desc");
            table.string("idMsg", 255);
            table.smallint("nbMax");
            table
                .integer("captain")
                .references("id")
                .inTable("User")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table
                .string("game", 255)
                .references("appid")
                .inTable("Game")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table.timestamp("dateCreated");
            table.timestamp("dateUpdated");
            table.boolean("validated");
            table.string("channelId", 255);
            table.specificType("dates", "timestamp[]");
        })
        .createTable("GroupUser", (table) => {
            table.increments("userid").primary();
            table.integer("groupid").notNullable();
            table.primary(["userid", "groupid"]);
            table
                .foreign("userid")
                .references("id")
                .inTable("User")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table
                .foreign("groupid")
                .references("id")
                .inTable("Group")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
        })
        .createTable("Observation", (table) => {
            table.increments("id").primary();
            table.string("userId", 255).notNullable();
            table.string("reporterId", 255).notNullable();
            table.text("reason");
            table.timestamp("date");
        })
        .createTable("Stats", (table) => {
            table.increments("id").primary();
            table.smallint("year");
            table
                .integer("userId")
                .references("id")
                .inTable("User")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table.integer("nbMsg").defaultTo(0);
            table.integer("nbGroupCreated").defaultTo(0);
            table.integer("nbGroupJoined").defaultTo(0);
            table.integer("nbGroupLeft").defaultTo(0);
            table.integer("nbGroupDissolved").defaultTo(0);
            table.integer("nbGroupEnded").defaultTo(0);
            table.integer("nbShopSold").defaultTo(0);
            table.integer("nbShopBought").defaultTo(0);
            table.integer("nbHero").defaultTo(0);
            table.integer("nbZero").defaultTo(0);
        })
        .createTable("MessageClue", (table) => {
            table.increments("id").primary();
            table.smallint("month");
            table.string("idMsg", 255);
            table.text("description");
        })
        .createTable("ClueField", (table) => {
            table.increments("id").primary();
            table
                .integer("idMsgClue")
                .references("id")
                .inTable("MessageClue")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table
                .enu("type", ["tag", "genre"], {
                    useNative: true,
                    enumName: "type_cluefield", // Nom de l'enum dans la base de données
                })
                .notNullable()
                .defaultTo("tag");
            table.string("name", 255);
            table.integer("value");
            table.boolean("found").defaultTo(false);
        })
        .createTable("Tower", (table) => {
            table.increments("id").primary();
            table
                .string("guildId", 255)
                .references("guildId")
                .inTable("GuildConfig")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table.integer("season");
            table.timestamp("start");
            table.boolean("started");
            table.timestamp("finish");
            table.boolean("finished");
            table
                .integer("msgClueId")
                .references("id")
                .inTable("MessageClue")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
        })
        .createTable("TowerBoss", (table) => {
            table.increments("id").primary();
            table
                .integer("towerId")
                .references("id")
                .inTable("Tower")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table.string("name", 255);
            table.smallint("hp");
            table.smallint("maxHp");
            table.smallint("season");
            table.boolean("hidden");
            table.smallint("order");
            table
                .integer("killedBy")
                .references("id")
                .inTable("User")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
        })
        .createTable("TowerStats", (table) => {
            table.increments("id").primary();
            table
                .integer("userId")
                .references("id")
                .inTable("User")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table.integer("season");
            table.timestamp("startDate");
            table.integer("nbValidatedGames");
            table.integer("currentFloor");
            table
                .integer("currentBoss")
                .references("id")
                .inTable("TowerBoss")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table.integer("totalDamage");
            table.specificType("completedGames", "varchar(255)[]");
        })
        .createTable("Job", (table) => {
            table.increments("id").primary();
            table.string("name", 255);
            table
                .string("guildId", 255)
                .references("guildId")
                .inTable("GuildConfig")
                .onUpdate("NO ACTION")
                .onDelete("NO ACTION");
            table.timestamp("when");
            table.string("functionName", 255);
            table.specificType("args", "varchar(255)[]");
            table.boolean("pending").defaultTo(true);
        })
        .createTable("MetaAchievements", (table) => {
            table.increments("id").primary();
            table.string("code", 255).notNullable().unique();
            table.text("title").notNullable();
            table.text("description");
            table.string("db", 255).notNullable();
            table.timestamp("createdAt").defaultTo(knex.fn.now());
        })
        .createTable("MetaAchievementTiers", (table) => {
            table.increments("id").primary();
            table
                .integer("metaAchievementId")
                .notNullable()
                .references("id")
                .inTable("MetaAchievements")
                .onUpdate("NO ACTION")
                .onDelete("CASCADE");
            table.integer("requirement").notNullable();
            table.text("title").notNullable();
            table.text("description").notNullable();
            table.string("img", 255);
            table.unique(["metaAchievementId", "requirement"]);
        })
        .createTable("UserMetaAchievementUnlocks", (table) => {
            table.integer("userId").notNullable();
            table.integer("metaAchievementTierId").notNullable();
            table.timestamp("unlockedAt");

            table
                .foreign("userId")
                .references("id")
                .inTable("User")
                .onUpdate("NO ACTION")
                .onDelete("CASCADE");

            table
                .foreign("metaAchievementTierId")
                .references("id")
                .inTable("MetaAchievementTiers")
                .onUpdate("NO ACTION")
                .onDelete("CASCADE");
            table.primary(["userId", "metaAchievementTierId"]);
        });

    // récup des achievements du json
    const metaAchievements = Object.entries(achievements).map(
        ([code, achievement]) => ({
            code,
            title: achievement.title,
            db: achievement.dbPG,
            description: achievement.desc,
        }),
    );

    if (metaAchievements.length > 0) {
        await knex("MetaAchievements").insert(metaAchievements);
    }

    const persistedAchievements = await knex("MetaAchievements").select(
        "id",
        "code",
    );

    const tiers = [];
    for (const [code, achievement] of Object.entries(achievements)) {
        const persistedAchievement = persistedAchievements.find(
            (row) => row.code === code,
        );

        if (!persistedAchievement) {
            continue;
        }

        for (const [requirement, tier] of Object.entries(achievement.succes)) {
            tiers.push({
                metaAchievementId: persistedAchievement.id,
                requirement: Number(requirement),
                title: tier.title,
                description: tier.desc,
                img: tier.img ?? null,
            });
        }
    }

    if (tiers.length > 0) {
        await knex("MetaAchievementTiers").insert(tiers);
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists("UserMetaAchievementUnlocks")
        .dropTableIfExists("MetaAchievementTiers")
        .dropTableIfExists("MetaAchievements")
        .dropTableIfExists("Job")
        .dropTableIfExists("TowerStats")
        .dropTableIfExists("TowerBoss")
        .dropTableIfExists("Tower")
        .dropTableIfExists("ClueField")
        .raw(`DROP TYPE IF EXISTS "type_cluefield"`)
        .dropTableIfExists("MessageClue")
        .dropTableIfExists("Stats")
        .dropTableIfExists("Observation")
        .dropTableIfExists("GroupUser")
        .dropTableIfExists("Group")
        .dropTableIfExists("User")
        .dropTableIfExists("GameItemShop")
        .raw(`DROP TYPE IF EXISTS "item_shop_state"`)
        .dropTableIfExists("Achievement")
        .dropTableIfExists("Game")
        .dropTableIfExists("GuildConfig");
};
