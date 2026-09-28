const BaseRepository = require("./BaseRepository");
const { GameItemShop } = require("../models/objection");

class GameItemShopRepository extends BaseRepository {
    constructor() {
        super(GameItemShop);
    }

    findByIdWithRelations(id) {
        return this.Model.query()
            .findById(id)
            .withGraphFetched('[gameInfo, sellerInfo, buyerInfo]');
    }

    findPendingItems(userId) {
        return this.Model.query()
            .where("seller", userId)
            .and('state', 'pending')
            .withGraphFetched('[gameInfo, sellerInfo, buyerInfo]');
    }

    findGameItemShopBy({ game, seller, notSold, limit } = {}) {
        let query = this.Model.query();

        // pas encore vendu (pas de buyer)
        if (notSold) {
            query = query.whereNull("buyer");
        }

        // filtre sur vendeur (ID Discord de l'utilisateur)
        if (seller) {
            query = query
                .joinRelated("sellerInfo")
                .where("sellerInfo.discordId", seller);
        }

        // filtre sur nom du jeu (insensible à la casse)
        if (game) {
            const escapedName = game.replace(/[%_]/g, "\\$&");
            query = query
                .joinRelated("gameInfo")
                .where("gameInfo.name", "ilike", `%${escapedName}%`);
        }

        if (limit) {
            query = query.limit(limit);
        }

        return query.withGraphFetched("[gameInfo, sellerInfo]");
    }

    async findGameItemShopByGame() {
        // non vendus, tri prix asc (comme $sort montant + group+$sort par appid)
        const items = await this.Model.query()
            .whereNull("buyer")
            .orderBy("price", "asc")
            .withGraphFetched("[gameInfo, sellerInfo]");

        // groupement par jeu (slots Objection-native) : [{ game, items }]
        const groups = new Map();
        for (const item of items) {
            if (!item.gameInfo) continue;
            const key = item.gameInfo.appid;
            if (!groups.has(key)) groups.set(key, { game: item.gameInfo, items: [] });
            groups.get(key).items.push(item);
        }

        return [...groups.values()].sort((a, b) => (a.game.appid ?? 0) - (b.game.appid ?? 0));
    }
}

module.exports = new GameItemShopRepository();
