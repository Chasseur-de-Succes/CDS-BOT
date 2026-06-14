const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} AchievementRow
 * @property {number} id
 * @property {number | null} appid
 * @property {string | null} apiName
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
