const succes = require("../../data/achievements.json");
const { getJsonValue } = require("../util");

function getAchievement(userDb, typeSucces) {
    const money = userDb.money;
    const userStat = userDb.stats;

    const infoSucces = succes[typeSucces];
    // on test si 'money' car non présent dans stat.
    const nbStat =
        typeSucces === "money"
            ? money
            : getJsonValue(userStat, infoSucces.db, "");

    // TODO a revoir, actuellement ca fonctionne car stat + 1, on passera forcément par là
    // mais par exemple pour money ca ne sera pas, car pas précis
    return infoSucces.succes[nbStat];
}

exports.getAchievement = getAchievement;
