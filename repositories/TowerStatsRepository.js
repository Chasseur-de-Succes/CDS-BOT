const BaseRepository = require('./BaseRepository');
const { TowerStats } = require("../models/objection");

class TowerStatsRepository extends BaseRepository {
    constructor() {
        super(TowerStats);
    }

    async findByUserAndSeason(userDb, season) {
        return await TowerStats.query()
            .where("season", season)
            .where("userId", userDb.id)
            .resultSize() > 0;
    }

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
}

module.exports = new TowerStatsRepository();