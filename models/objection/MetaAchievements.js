const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} MetaAchievementsRow
 * @property {number} id
 * @property {string} code
 * @property {string} name
 * @property {string | null} description
 * @property {Date | null} createdAt
 */

class MetaAchievements extends BaseModel {
    static get tableName() {
        return "MetaAchievements";
    }

    static get idColumn() {
        return "id";
    }
}

module.exports = MetaAchievements;
