const BaseModel = require("./BaseModel");

/**
 * @typedef {Object} GroupUserRow
 * @property {number} userid
 * @property {number} groupid
 */

class GroupUser extends BaseModel {
    static get tableName() {
        return "GroupUser";
    }

    static get idColumn() {
        return ["userid", "groupid"];
    }

    static get relationMappings() {
        const Group = require("./Group");
        const User = require("./User");

        return {
            user: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: "GroupUser.userid",
                    to: "User.id",
                },
            },
            group: {
                relation: BaseModel.BelongsToOneRelation,
                modelClass: Group,
                join: {
                    from: "GroupUser.groupid",
                    to: "Group.id",
                },
            },
        };
    }
}

module.exports = GroupUser;
