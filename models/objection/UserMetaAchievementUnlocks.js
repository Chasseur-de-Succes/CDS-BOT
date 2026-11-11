const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} UserMetaAchievementUnlocksRow
 * @property {number} userId
 * @property {number} metaAchievementTierId
 * @property {Date | null} unlockedAt
 */

class UserMetaAchievementUnlocks extends BaseModel {
    static get tableName() {
        return "UserMetaAchievementUnlocks";
    }

    static get idColumn() {
        return ["userId", "metaAchievementTierId"];
    }

    static get relationMappings() {
        const User = require("./User");
        const MetaAchievementTiers = require("./MetaAchievementTiers");

        return {
            user: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: "UserMetaAchievementUnlocks.userId",
                    to: "User.id",
                },
            },
            metaAchievementTier: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: MetaAchievementTiers,
                join: {
                    from: "UserMetaAchievementUnlocks.metaAchievementTierId",
                    to: "MetaAchievementTiers.id",
                },
            },
        };
    }
}

module.exports = UserMetaAchievementUnlocks;
