const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} TowerBossRow
 * @property {number} id
 * @property {number | null} towerId
 * @property {string | null} name
 * @property {number | null} hp
 * @property {number | null} maxHp
 * @property {number | null} season
 * @property {boolean | null} hidden
 * @property {number | null} order
 * @property {number | null} killedBy
 */

class TowerBoss extends BaseModel {
    static get tableName() {
        return "TowerBoss";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const Tower = require("./Tower");
        const TowerStats = require("./TowerStats");
        const User = require("./User");

        return {
            tower: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: Tower,
                join: {
                    from: "TowerBoss.towerId",
                    to: "Tower.id",
                },
            },
            killedByUser: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: "TowerBoss.killedBy",
                    to: "User.id",
                },
            },
            linkedTowerStats: {
                relation: BaseModel.HasManyRelation,
                modelClass: TowerStats,
                join: {
                    from: "TowerBoss.id",
                    to: "TowerStats.currentBoss",
                },
            },
        };
    }
}

module.exports = TowerBoss;
