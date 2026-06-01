const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} UserMetaAchievementTiersRow
 * @property {number} userid
 * @property {number} achievementTier
 * @property {Date | null} unlockedAt
 */

class UserMetaAchievementTiers extends BaseModel {
    static get tableName() {
        return "UserMetaAchievementTiers";
    }

    static get idColumn() {
        return ["userid", "achievementTier"];
    }

    static get relationMappings() {
        const User = require("./User");

        return {
            user: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: "UserMetaAchievementTiers.userid",
                    to: "User.id",
                },
            },
        };
    }
}

module.exports = UserMetaAchievementTiers;
