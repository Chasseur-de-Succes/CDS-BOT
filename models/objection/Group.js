const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} GroupRow
 * @property {number} id
 * @property {string | null} guildId
 * @property {string | null} name
 * @property {string | null} desc
 * @property {string | null} idMsg
 * @property {number | null} nbMax
 * @property {number | null} captain
 * @property {string | null} game
 * @property {Date | null} dateCreated
 * @property {Date | null} dateUpdated
 * @property {boolean | null} validated
 * @property {string | null} channelId
 * @property {Date[] | null} dates
 */

class Group extends BaseModel {
    static get tableName() {
        return "Group";
    }

    static get idColumn() {
        return "id";
    }

    static get relationMappings() {
        const User = require("./User");
        const Game = require("./Game");
        const GroupUser = require("./GroupUser");

        return {
            captainUser: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: "Group.captain",
                    to: "User.id",
                },
            },
            gameInfo: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: Game,
                join: {
                    from: "Group.game",
                    to: "Game.appid",
                },
            },
            membersLinks: {
                relation: BaseModel.HasManyRelation,
                modelClass: GroupUser,
                join: {
                    from: "Group.id",
                    to: "GroupUser.groupid",
                },
            },
        };
    }
}

module.exports = Group;
