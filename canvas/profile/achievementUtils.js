function getAchievementRarity(
    progressValue,
    valuePlat,
    valueGold,
    valueSilver,
    valueBronze,
) {
    if (progressValue >= valuePlat) return "platinum";
    if (progressValue >= valueGold) return "gold";
    if (progressValue >= valueSilver) return "silver";
    if (progressValue >= valueBronze) return "bronze";

    return "locked";
}

function getAdventAchievementRarity(indexUser) {
    if (indexUser === 0) return "platinum";
    if (indexUser === 1) return "gold";
    if (indexUser === 2) return "silver";

    return "bronze";
}

module.exports = { 
    getAchievementRarity,
    getAdventAchievementRarity,
};