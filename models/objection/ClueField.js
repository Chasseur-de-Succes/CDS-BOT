const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} ClueFieldRow
 * @property {number} id
 * @property {number | null} idMsgClue
 * @property {"tag" | "genre"} type
 * @property {string | null} type
 * @property {string | null} name
 * @property {integer | null} value
 * @property {boolean} found
 */

class ClueField extends BaseModel {
    static get tableName() {
        return "ClueField";
    }

    static get idColumn() {
        return "id";
    }

    static get jsonSchema() {
        return {
            type: "object",
            required: ["type"],
            properties: {
                id: { type: "integer" },
                idMsgClue: { type: ["integer", "null"] },
                type: { type: "string", enum: ["tag", "genre"] },
                name: { type: ["string", "null"] },
                value: { type: ["integer", "null"] },
                found: { type: "boolean" },
            },
        };
    }

    static get relationMappings() {
        const MessageClue = require("./MessageClue");

        return {
            messageClue: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: MessageClue,
                join: {
                    from: "ClueField.idMsgClue",
                    to: "MessageClue.id",
                },
            },
        };
    }
}

module.exports = ClueField;
