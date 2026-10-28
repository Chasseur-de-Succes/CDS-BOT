// ---------------
// Helper functions for Discord slash command autocomplete
// ---------------
const { DISCORD_LIMITS } = require("../util/constants");

// Tronquer le nom si il dépasse la limite imposé par Discord (100 char)
function formatAutocompleteName(name) {
    return name?.length > DISCORD_LIMITS.CHAR_LIMIT_AUTOCOMPLETE 
        ? `${name.substring(0, DISCORD_LIMITS.CHAR_LIMIT_AUTOCOMPLETE - 4)}...` 
        : name;
}

module.exports = {
    formatAutocompleteName,
};
