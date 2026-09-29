const BaseRepository = require('./BaseRepository');
const { Tower, MessageClue, ClueField, TowerStats, TowerBoss } = require("../models/objection");

class TowerRepository extends BaseRepository {
    constructor() {
        super(Tower);
    }

    findByGuildIdAndStarted(guildId) {
        return this.Model.query()
            .where("guildId", guildId)
            .where("started", true)
            .withGraphFetched('messageClue')
            .first();
    }

    findCurrentSeason(guildId) {
        return this.Model.query()
            .select("id", "season")
            .where("guildId", guildId)
            .where("started", true)
            .first();
    }

    /* Boss */
    findCurrentBoss(towerId, season) {
        return TowerBoss.query()
            .where("towerId", towerId)
            .where("season", season)
            .where("hp", ">", 0)
            .where('isDiscovered', true)
            .orderBy("order")
            .first();
    }

    /* TowerStats */
    findTop10UsersBySeason(season, limit = 10) {
        return TowerStats.query()
            .where("season", season)
            .orderBy('totalDamage', 'desc')
            .withGraphFetched('user')
            .limit(limit);
    }

    findRankingForSeason(season, userDb) {
        return TowerStats.query()
            .select('rank', 'totalDamage')
            .from(
                TowerStats.query()
                .select(
                    'userId',
                    'totalDamage',
                    // Calcule le rang ordonné par le score décroissant
                    TowerStats.raw('RANK() OVER (ORDER BY "totalDamage" DESC) as rank')
                )
                // LE FILTRE DE SAISON DOIT ÊTRE ICI :
                // On classe les joueurs uniquement au sein de la saison demandée
                .where('season', season)
                .as('ranked_stats')
            )
        .where("userId", userDb.id)
        .first();
    }

    /* Clue Field && Message Clue*/
    findCurrentClue(month) {
        return MessageClue.query()
            .where("month", month)
            .first();
    }
    findClueFields(id) {
        return ClueField.query()
            .where("idMsgClue", id)
    }
    updateMessageClue(idMsgClue, data) {
        return MessageClue.query().findById(idMsgClue).patch(data);
    }
}

module.exports = new TowerRepository();