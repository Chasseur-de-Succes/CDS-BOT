const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} StatsRow
 * @property {number} id
 * @property {number | null} year
 * @property {number | null} userId
 * @property {number} nbMsg
 * @property {number} nbGroupCreated
 * @property {number} nbGroupJoined
 * @property {number} nbGroupLeft
 * @property {number} nbGroupDissolved
 * @property {number} nbGroupEnded
 * @property {number} nbShopSold
 * @property {number} nbShopBought
 * @property {number} nbHero
 * @property {number} nbZero
 */

class Stats extends BaseModel {
    static get tableName() {
        return "Stats";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const User = require("./User");

        return {
            user: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: "Stats.userId",
                    to: "User.id",
                },
            },
        };
    }
}

module.exports = Stats;
