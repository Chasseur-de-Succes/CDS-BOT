const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} UserRow
 * @property {number} id
 * @property {string | null} discordId
 * @property {string | null} steamId
 * @property {string | null} username
 * @property {number} xp
 * @property {number} level
 * @property {number} money
 * @property {boolean} banned
 * @property {boolean} blacklisted
 * @property {number} moneyLimit
 * @property {Date | null} lastBuy
 * @property {number} nbWarning
 */

class User extends BaseModel {
    static get tableName() {
        return "User";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const Group = require("./Group");
        const GroupUser = require("./GroupUser");
        const Stats = require("./Stats");
        const TowerBoss = require("./TowerBoss");
        const TowerStats = require("./TowerStats");
        const UserMetaAchievementUnlocks = require("./UserMetaAchievementUnlocks");

        return {
            captainedGroups: {
                relation: BaseModel.HasManyRelation,
                modelClass: Group,
                join: {
                    from: "User.id",
                    to: "Group.captain",
                },
            },
            groupLinks: {
                relation: BaseModel.HasManyRelation,
                modelClass: GroupUser,
                join: {
                    from: "User.id",
                    to: "GroupUser.userid",
                },
            },
            stats: {
                relation: BaseModel.HasManyRelation,
                modelClass: Stats,
                join: {
                    from: "User.id",
                    to: "Stats.userId",
                },
            },
            killedTowerBosses: {
                relation: BaseModel.HasManyRelation,
                modelClass: TowerBoss,
                join: {
                    from: "User.id",
                    to: "TowerBoss.killedBy",
                },
            },
            towerStats: {
                relation: BaseModel.HasManyRelation,
                modelClass: TowerStats,
                join: {
                    from: "User.id",
                    to: "TowerStats.userId",
                },
            },
            achievementTiers: {
                relation: BaseModel.HasManyRelation,
                modelClass: UserMetaAchievementUnlocks,
                join: {
                    from: "User.id",
                    to: "UserMetaAchievementUnlocks.userid",
                },
            },
        };
    }
}

module.exports = User;
