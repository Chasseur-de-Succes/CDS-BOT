const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} MetaAchievementsRow
 * @property {number} id
 * @property {string} code
 * @property {string} title
 * @property {string} db
 * @property {Date | null} createdAt
 */

class MetaAchievements extends BaseModel {
    static get tableName() {
        return "MetaAchievements";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const MetaAchievementTiers = require("./MetaAchievementTiers");

        return {
            tiers: {
                relation: BaseModel.HasManyRelation,
                modelClass: MetaAchievementTiers,
                join: {
                    from: "MetaAchievements.id",
                    to: "MetaAchievementTiers.metaAchievementId",
                },
            },
        };
    }
}

module.exports = MetaAchievements;
