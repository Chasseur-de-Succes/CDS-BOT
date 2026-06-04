const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} UserMetaAchievementUnlocksRow
 * @property {number} userid
 * @property {number} achievementTier
 * @property {Date | null} unlockedAt
 */

class UserMetaAchievementUnlocks extends BaseModel {
    static get tableName() {
        return "UserMetaAchievementUnlocks";
    }

    static get idColumn() {
        return ["userid", "achievementTier"];
    }

    static get relationMappings() {
        const User = require("./User");
        const MetaAchievementTiers = require("./MetaAchievementTiers");

        return {
            user: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: "UserMetaAchievementUnlocks.userid",
                    to: "User.id",
                },
            },
            achievementTier:     {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: MetaAchievementTiers,
                join: {
                    from: "UserMetaAchievementUnlocks.achievementTier",
                    to: "MetaAchievementTiers.id",
                }
            }
        };
    }
}

module.exports = UserMetaAchievementUnlocks;
