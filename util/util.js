const { delay } = require("./constants");

function escapeRegExp(string) {
    return string?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function monthDiff(d1, d2) {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
}

function daysDiff(d1, d2) {
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 0 ? 0 : diffDays;
}

// recup la valeur d'un chemin dans un JSON
// ex: path = 'img.heros' dans { img: {heros: 1} } retourne '1'
function getJsonValue(model = {}, path = "", def = "") {
    const parts = path.split(".");

    if (parts.length > 1 && typeof model[parts[0]] === "object") {
        return getJsonValue(
            model[parts[0]],
            parts.splice(1).join("."),
            def,
        );
    }

    return model[parts[0]] || def;
}

// retry tous les 5 mins
async function retryAfter5min(fn) {
    while (true) {
        try {
            await fn();
            break; // 'return' would work here as well
        } catch (err) {
            if (err.status === 429) {
                logger.info("retry ! ", err);
                // att 5 min
                await delay(300000);
            } else if (err.status === 403) {
                logger.info("forbidden ..", err.status);
                // console.log(err);
                break;
            } else {
                break;
            }
        }
    }
    // try {
    //     return fn();
    // } catch (err) {
    //     console.log('retry ! ', err);
    //     // att 5 min
    //     //await delay(300000);
    //     return this.retryAfter5min(fn);
    // }

    // return fn().catch(async function(err) {
    //     console.log('retry ! ', err);
    //     // att 5 min
    //     //await delay(300000);
    //     return retryAfter5min(fn);
    // });
}

module.exports = {
    escapeRegExp,
    monthDiff,
    daysDiff,
    getJsonValue,
    retryAfter5min,
};
