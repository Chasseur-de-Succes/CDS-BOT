const succes = require('../../data/achievements.json');
const { getJSONValue } = require('../util');

async function getAchievement(userDB, typeSucces) {
    const money = userDB.money;
    const userStat = userDB.stats
    
    const infoSucces = succes[typeSucces];
    // on test si 'money' car non présent dans stat.
    const nbStat = typeSucces === 'money' ? money : getJSONValue(userStat, infoSucces.db, '')
    
    // TODO a revoir, actuellement ca fonctionne car stat + 1, on passera forcément par là
    // mais par exemple pour money ca ne sera pas, car pas précis
    return infoSucces.succes[nbStat];
}

exports.getAchievement = getAchievement