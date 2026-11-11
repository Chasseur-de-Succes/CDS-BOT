const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} TowerStatsRow
 * @property {number} id
 * @property {number | null} userId
 * @property {number | null} season
 * @property {Date | null} startDate
 * @property {number | null} nbValidatedGames
 * @property {number | null} currentFloor
 * @property {number | null} currentBoss
 * @property {number | null} totalDamage
 * @property {string[] | null} completedGames
 */

class TowerStats extends BaseModel {
    static get tableName() {
        return "TowerStats";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const TowerBoss = require("./TowerBoss");
        const User = require("./User");

        return {
            user: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: "TowerStats.userId",
                    to: "User.id",
                },
            },
            currentTowerBoss: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: TowerBoss,
                join: {
                    from: "TowerStats.currentBoss",
                    to: "TowerBoss.id",
                },
            },
        };
    }
}

module.exports = TowerStats;
