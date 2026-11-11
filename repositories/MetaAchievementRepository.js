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

    findAllAchievements() {
        return MetaAchievements.query().orderBy("code");
    }

    findMetaAchievementByCode(code) {
        return MetaAchievements.query().where("code", code).first();
    }

    findTiersByCode(code) {
        return MetaAchievementTiers.query()
            .join(
                "MetaAchievements",
                "MetaAchievements.id",
                "MetaAchievementTiers.metaAchievementId",
            )
            .where("MetaAchievements.code", code)
            .select("MetaAchievementTiers.*");
    }

    /**
     * Retourne les paliers d'un achievement avec un flag `unlocked`
     * indiquant si l'utilisateur a débloqué ce palier.
     */
    findTiersWithUnlockStatus(userId, code) {
        return MetaAchievementTiers.query()
            .join(
                "MetaAchievements",
                "MetaAchievements.id",
                "MetaAchievementTiers.metaAchievementId",
            )
            .leftJoin("UserMetaAchievementUnlocks", (join) => {
                join.on(
                    "UserMetaAchievementUnlocks.metaAchievementTierId",
                    "MetaAchievementTiers.id",
                ).andOnVal("UserMetaAchievementUnlocks.userId", "=", userId);
            })
            .where("MetaAchievements.code", code)
            .select(
                "MetaAchievementTiers.*",
                MetaAchievementTiers.raw(
                    '"UserMetaAchievementUnlocks"."userId" IS NOT NULL AS "unlocked"',
                ),
            )
            .orderBy("MetaAchievementTiers.requirement");
    }

    /**
     * Retourne tous les paliers débloqués par un utilisateur,
     * avec le code de l'achievement associé (pour le rendu canvas).
     */
    findUnlockedTiersByUser(userId) {
        return MetaAchievementTiers.query()
            .join(
                "UserMetaAchievementUnlocks",
                "UserMetaAchievementUnlocks.metaAchievementTierId",
                "MetaAchievementTiers.id",
            )
            .join(
                "MetaAchievements",
                "MetaAchievements.id",
                "MetaAchievementTiers.metaAchievementId",
            )
            .where("UserMetaAchievementUnlocks.userId", userId)
            .select(
                "MetaAchievements.code",
                "MetaAchievementTiers.requirement",
            );
    }

    findUnlockedTierIds(userId) {
        return UserMetaAchievementUnlocks.query()
            .where("userId", userId)
            .select("metaAchievementTierId");
    }

    unlockTier(userId, tierId) {
        return UserMetaAchievementUnlocks.query()
            .insert({
                userId,
                metaAchievementTierId: tierId,
                unlockedAt: new Date(),
            })
            .onConflict(["userId", "metaAchievementTierId"])
            .ignore();
    }
}

module.exports = new MetaAchievementRepository();
