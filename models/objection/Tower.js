const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} TowerRow
 * @property {number} id
 * @property {string | null} guildId
 * @property {number | null} season
 * @property {Date | null} start
 * @property {boolean | null} started
 * @property {Date | null} finish
 * @property {boolean | null} finished
 * @property {number | null} msgClueId
 */

class Tower extends BaseModel {
    static get tableName() {
        return "Tower";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const GuildConfig = require("./GuildConfig");
        const MessageClue = require("./MessageClue");
        const TowerBoss = require("./TowerBoss");

        return {
            guildConfig: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: GuildConfig,
                join: {
                    from: "Tower.guildId",
                    to: "GuildConfig.guildId",
                },
            },
            messageClue: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: MessageClue,
                join: {
                    from: "Tower.msgClueId",
                    to: "MessageClue.id",
                },
            },
            bosses: {
                relation: BaseModel.HasManyRelation,
                modelClass: TowerBoss,
                join: {
                    from: "Tower.id",
                    to: "TowerBoss.towerId",
                },
            },
        };
    }
}

module.exports = Tower;
