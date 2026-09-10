const { MetaAchRepository, StatsRepository } = require("../../repositories");

/**
 * Vérifie si un utilisateur a atteint un palier (MetaAchievementTiers)
 * d'un méta-achievement qu'il n'a pas déjà débloqué.
 * @param {import("../../models/objection/User").User} userDb
 * @param {string} code - code du MetaAchievements à tester
 * @returns {Promise<{title: string, desc: string, img: string|null}|null>}
 */
async function getAchievement(userDb, code) {
    const returnBestPalier = (palier) =>
        palier
            ? {
                  title: palier.title,
                  desc: palier.description,
                  img: palier.img,
              }
            : null;

    const metaAch = await MetaAchRepository.findMetaAchievementByCode(code);
    if (!metaAch) {
        return null;
    }

    // valeur de la stat concernée (totale, toutes années confondues)
    const statValue =
        metaAch.db === "money"
            ? userDb.money || 0
            : (await StatsRepository.findTotalStat(userDb.id, metaAch.db))
                  ?.total || 0;

    const tiers = await MetaAchRepository.findTiersByCode(code);
    if (tiers.length === 0) {
        return null;
    }

    const unlocked = await MetaAchRepository.findUnlockedTierIds(userDb.id);
    const unlockedIds = new Set(
        unlocked.map((u) => u.metaAchievementTierId),
    );

    // paliers atteints et non encore débloqués
    const reachable = tiers
        .filter(
            (t) => t.requirement <= statValue && !unlockedIds.has(t.id),
        )
        .sort((a, b) => a.requirement - b.requirement);

    const best = reachable[reachable.length - 1];
    if (!best) {
        return null;
    }

    await MetaAchRepository.unlockTier(userDb.id, best.id);
    return returnBestPalier(best);
}

exports.getAchievement = getAchievement;