const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} MessageClueRow
 * @property {number} id
 * @property {number | null} month
 * @property {string | null} idMsg
 * @property {string | null} description
 */

class MessageClue extends BaseModel {
    static get tableName() {
        return "MessageClue";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const ClueField = require("./ClueField");
        const Tower = require("./Tower");

        return {
            clueFields: {
                relation: BaseModel.HasManyRelation,
                modelClass: ClueField,
                join: {
                    from: "MessageClue.id",
                    to: "ClueField.idMsgClue",
                },
            },
            towers: {
                relation: BaseModel.HasManyRelation,
                modelClass: Tower,
                join: {
                    from: "MessageClue.id",
                    to: "Tower.msgClueId",
                },
            },
        };
    }
}

module.exports = MessageClue;
