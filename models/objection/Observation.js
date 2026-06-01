const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} ObservationRow
 * @property {number} id
 * @property {string} userId
 * @property {string} reporterId
 * @property {string | null} reason
 * @property {Date | null} date
 */

class Observation extends BaseModel {
    static get tableName() {
        return "Observation";
    }

    static get idColumn() {
        return "id";
    }
}

module.exports = Observation;
