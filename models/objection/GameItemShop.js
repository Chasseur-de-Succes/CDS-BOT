const BaseModel = require("./BaseModel");
const User = require("./User");

/**
 * @typedef {Object} GameItemShopRow
 * @property {number} id
 * @property {string | null} guildId
 * @property {string | null} game
 * @property {number | null} seller
 * @property {number | null} buyer
 * @property {number | null} price
 * @property {"listed" | "pending" | "done"} state
 */

class GameItemShop extends BaseModel {
  static get tableName() {
    return "GameItemShop";
  }

  static get idColumn() {
    return "id";
  }

  static get relationMappings() {
    const User = require("./User");
    const Game = require("./Game");

    return {
      gameInfo: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Game,
        join: {
          from: "GameItemShop.game",
          to: "Game.appid",
        }
      },
      sellerInfo: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "GameItemShop.seller",
          to: "User.id",
        }
      },
      buyerInfo: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "GameItemShop.buyer",
          to: "User.id",
        }
      }
    }
  }

}

module.exports = GameItemShop;