/**
 * @typedef {Object} GuildConfigRow
 * @property {string} guildId
 * @property {string | null} channelWelcome
 * @property {string | null} channelListGroup
 * @property {string | null} channelHeros
 * @property {string | null} channelZeros
 * @property {string | null} channelLogs
 * @property {string | null} channelCreateVocal
 * @property {string | null} channelCatGroup
 * @property {string | null} channelCatGroup2
 * @property {string | null} channelFeed
 * @property {string | null} channelFeedAchievement
 * @property {string | null} channelTickets
 * @property {string | null} channelEventTower
 * @property {string[] | null} channelVoice
 * @property {string | null} webhook
 */
const BaseModel = require("./BaseModel");

class GuildConfig extends BaseModel {
    static get tableName() {
        return "GuildConfig";
    }

    static get idColumn() {
        return "guildId";
    }

    /**
     * @param {string} guildId
     * @returns {GuildConfigRow | undefined}
     */
    static async getByGuildId(guildId) {
        const guildConfig = await this.query().findById(guildId);
        return guildConfig;
    }

    static get relationMappings() {
        const Job = require("./Job");
        const Tower = require("./Tower");

        return {
            jobs: {
                relation: BaseModel.HasManyRelation,
                modelClass: Job,
                join: {
                    from: "GuildConfig.guildId",
                    to: "Job.guildId",
                },
            },
            towers: {
                relation: BaseModel.HasManyRelation,
                modelClass: Tower,
                join: {
                    from: "GuildConfig.guildId",
                    to: "Tower.guildId",
                },
            },
        };
    }
}

module.exports = GuildConfig;
