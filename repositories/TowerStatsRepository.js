const BaseRepository = require('./BaseRepository');
const { TowerStats } = require("../models/objection");

class TowerStatsRepository extends BaseRepository {
    constructor() {
        super(TowerStats);
    }

    async findByUserAndSeason(userDb, season) {
        return this.Model.query()
            .where("userId", userDb.id)
            .where("season", season)
            .first();
    }

    async hasCompletedGames(userDb, season, appid) {
        const hasCompleted = await this.Model.query()
            .select(1)
            .where('userId', userDb.id)
            .where('season', season)
            .whereRaw('"completedGames" @> ARRAY[?]::varchar[]', [appid])
            .first();

        return !!hasCompleted;
    }

    async hasUserAndSeason(userDb, season) {
        return await this.Model.query()
            .where("userId", userDb.id)
            .where("season", season)
            .resultSize() > 0;
    }

    async completeGames(userDb, season, appid) {
        await this.Model.query()
            .where('userId', userDb.id)
            .where('season', season)
            .patch({
                nbValidatedGames: TowerStats.raw('COALESCE("nbValidatedGames", 0) + 1'),
                completedGames: TowerStats.raw(
                    'COALESCE("completedGames", ARRAY[]::varchar[]) || ARRAY[?]::varchar[]',
                    [appid]
                )
            });
    }

    async incrementCurrentFloor(userDb, season, step = 1) {
        const stat = await TowerStats.query()
            .where('userId', userDb.id)
            .where('season', season)
            .first();
        if (!stat) return null;

        return stat.$query().patchAndFetch({
            currentFloor: TowerStats.raw(
                'COALESCE("currentFloor", 0) + ?',
                [step],
            ),
        });
    }

    async decrementCurrentFloor(userDb, season, step = 1) {
        const stat = await TowerStats.query()
            .where('userId', userDb.id)
            .where('season', season)
            .first();
        if (!stat) return null;

        return stat.$query().patchAndFetch({
            currentFloor: TowerStats.raw(
                'GREATEST(COALESCE("currentFloor", 0) - ?, 0)',
                [step],
            ),
        });
    }

    async setCurrentBoss(userDb, season, bossId) {
        return TowerStats.query()
            .where('userId', userDb.id)
            .where('season', season)
            .patch({ currentBoss: bossId });
    }

    async addDamage(userDb, season, dmg) {
        return TowerStats.query()
            .where('userId', userDb.id)
            .where('season', season)
            .patch({
                totalDamage: TowerStats.raw(
                    'COALESCE("totalDamage", 0) + ?',
                    [dmg],
                ),
            });
    }

    async addCompletedGame(userDb, season, appid) {
        return TowerStats.query()
            .where('userId', userDb.id)
            .where('season', season)
            .patch({
                completedGames: TowerStats.raw(
                    'COALESCE("completedGames", ARRAY[]::varchar[]) || ARRAY[?]::varchar[]',
                    [appid],
                ),
            });
    }

    /* Classement */
    findTop10UsersBySeason(season, limit = 10) {
        return this.Model.query()
            .where("season", season)
            .orderBy('totalDamage', 'desc')
            .withGraphFetched('user')
            .limit(limit);
    }

    findRankingForSeason(season, userDb) {
        return this.Model.query()
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