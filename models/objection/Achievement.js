const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} AchievementRow
 * @property {number} id
 * @property {number} appid
 * @property {string} apiName
 * @property {string | null} displayName
 * @property {string | null} description
 * @property {string | null} icon
 * @property {string | null} icongray
 */

class Achievement extends BaseModel {
    static get tableName() {
        return "Achievement";
    }

    static get idColumn() {
        return "id";
    }

    static get jsonSchema() {
        return {
            type: "object",
            required: ["appid", "apiName"],
            properties: {
                id: { type: "integer" },
                appid: { type: "integer" },
                apiName: { type: "string", minLength: 1 },
                displayName: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
                icon: { type: ["string", "null"] },
                icongray: { type: ["string", "null"] },
            },
        };
    }

    static get relationMappings() {
        const Game = require("./Game");

        return {
            game: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: Game,
                join: {
                    from: "Achievement.appid",
                    to: "Game.appid",
                },
            },
        };
    }
}

module.exports = Achievement;
