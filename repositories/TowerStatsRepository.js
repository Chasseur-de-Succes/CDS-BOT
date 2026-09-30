const BaseRepository = require('./BaseRepository');
const { TowerStats } = require("../models/objection");

class TowerStatsRepository extends BaseRepository {
    constructor() {
        super(TowerStats);
    }

    async hasCompletedGames(userDb, season, appid) {
        const hasCompleted = await TowerStats.query()
            .select(1)
            .where('userId', userDb.id)
            .where('season', season)
            .whereRaw('completed_games @> ARRAY[?]', [appid])
            .first();

        return !!hasCompleted;
    }

    async hasUserAndSeason(userDb, season) {
        return await TowerStats.query()
            .where("userId", userDb.id)
            .where("season", season)
            .resultSize() > 0;
    }

    async completeGames(userDb, season, appid) {
        await TowerStats.query()
            .where('userId', userDb.id)
            .where('season', season)
            .patch({
                etage: TowerStats.raw('etage + 1'),
                completed_games: TowerStats.raw('completed_games || ARRAY[?]', [appid])
            });
    }

    /* Classement */
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