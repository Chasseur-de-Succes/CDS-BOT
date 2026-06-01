const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} MetaAchievementTiersRow
 * @property {number} id
 * @property {number} tier
 * @property {number} requirement
 * @property {string | null} name
 */

class MetaAchievementTiers extends BaseModel {
    static get tableName() {
        return "MetaAchievementTiers";
    }

    static get idColumn() {
        return "id";
    }
}

module.exports = MetaAchievementTiers;
