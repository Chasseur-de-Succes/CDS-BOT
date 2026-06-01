const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} JobRow
 * @property {number} id
 * @property {string | null} name
 * @property {string | null} guildId
 * @property {Date | null} when
 * @property {string | null} functionName
 * @property {string[] | null} args
 * @property {boolean} pending
 */

class Job extends BaseModel {
    static get tableName() {
        return "Job";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const GuildConfig = require("./GuildConfig");

        return {
            guildConfig: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: GuildConfig,
                join: {
                    from: "Job.guildId",
                    to: "GuildConfig.guildId",
                },
            },
        };
    }
}

module.exports = Job;
