const BaseRepository = require("./BaseRepository");
const {
    UserMetaAchievementUnlocks,
    MetaAchievements,
    MetaAchievementTiers,
} = require("../models/objection");

class MetaAchievementRepository extends BaseRepository {
    constructor() {
        super(UserMetaAchievementUnlocks);
    }

    findMetaAchievementByCode(code) {
        return MetaAchievements.query()
            .where('code', code)
            .first();
    }

    findTiersByCode(code) {
        return MetaAchievementTiers.query()
            .join(
                'MetaAchievements',
                'MetaAchievements.id',
                'MetaAchievementTiers.metaAchievementId',
            )
            .where('MetaAchievements.code', code);
    }

    findUnlockedTierIds(userId) {
        return UserMetaAchievementUnlocks.query()
            .where('userId', userId)
            .select('metaAchievementTierId');
    }

    unlockTier(userId, tierId) {
        return UserMetaAchievementUnlocks.query()
            .insert({
                userId,
                metaAchievementTierId: tierId,
                unlockedAt: new Date(),
            })
            .onConflict(['userId', 'metaAchievementTierId'])
            .ignore();
    }
}

module.exports = new MetaAchievementRepository();