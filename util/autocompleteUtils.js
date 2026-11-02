// ---------------
// Helper functions for Discord slash command autocomplete
// ---------------
const { DISCORD_LIMITS } = require("../util/constants");
const { GameRepository } = require("../repositories");

/**
 * Tronquer le nom s'il dépasse la limite de caractères autorisée par Discord 
 * pour les options d'autocomplétion (100 char)
 * @param {string} name Le nom à formater
 * @returns {string} Le nom tronqué si nécessaire, sinon le nom original
 */
function truncateAutocompleteName(name) {
    return name?.length > DISCORD_LIMITS.CHAR_LIMIT_AUTOCOMPLETE 
        ? `${name.substring(0, DISCORD_LIMITS.CHAR_LIMIT_AUTOCOMPLETE - 4)}...` 
        : name;
}

/**
 * Obtenir une liste de jeux correspondant à la saisie afin de les proposer lors de l'autocomplétion
 * @param {string} query Texte a recherché
 * @returns {Array<{name: string, value: string}>} Liste des jeux correspondant à la recherche
 */
async function getGameAutocompleteOptions(query) {
    let filtered = [];
    let choices = [];
    let exact = [];
    
    const type =  ["game"];
    const limit = DISCORD_LIMITS.CHOICES_PER_AUTOCOMPLETE;

    // recherche nom exacte
    exact = await GameRepository.findByNameExactly(query, type);

    // recup limit de 25 jeux, correspondant a la value rentré
    filtered = await GameRepository.findByName(query, limit, type);

    // filtre nom jeu existant ET != du jeu exact trouvé (pour éviter doublon)
    filtered = filtered.filter(
        (jeu) => jeu.name && jeu.name !== exact[0]?.name,
    );

    // Formatage des objets pour l'autocomplete Discord ({ name, value })
    choices = filtered.map((element) => ({
        // si nom jeu dépasse limite imposé par Discord (100 char)
        name: truncateAutocompleteName(element.name),
        // on utilise l'appid pour le jeu
        value: String(element.appid),
    }));

    // si nom exact trouvé (pour 'jeu')
    if (exact.length === 1) {
        const jeuExact = exact[0];
        // on récupère les 24 premiers
        choices = choices.slice(0, 24);
        // et on ajoute en 1er l'exact
        choices.unshift({
            name: truncateAutocompleteName(jeuExact.name),
            value: String(jeuExact.appid),
        });
    }

    return choices;
}

module.exports = {
    truncateAutocompleteName,
    getGameAutocompleteOptions,
};
