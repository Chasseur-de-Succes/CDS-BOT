const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} MetaAchievementTiersRow
 * @property {number} id
 * @property {number} metaAchievementId
 * @property {number} requirement
 * @property {string} title
 * @property {string} description
 * @property {string | null} img
 */

class MetaAchievementTiers extends BaseModel {
    static get tableName() {
        return "MetaAchievementTiers";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const MetaAchievements = require("./MetaAchievements");

        return {
            achievement: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: MetaAchievements,
                join: {
                    from: "MetaAchievementTiers.metaAchievementId",
                    to: "MetaAchievements.id",
                },
            },
        };
    }
}

module.exports = MetaAchievementTiers;
