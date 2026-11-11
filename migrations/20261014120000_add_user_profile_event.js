/**
 * Ajoute les colonnes JSONB `profile` et `event` à la table User.
 *
 * - `profile` : settings d'affichage du profil (text/border/avatar/background),
 *   utilisé par slash_commands/profile.js (migration en attente).
 * - `event` : données d'événements archivées, dont `advent` 2022 (aucun usage
 *   runtime, conservé pour l'historique).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("User", (table) => {
        table.jsonb("profile");
        table.jsonb("event");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.alterTable("User", (table) => {
        table.dropColumn("profile");
        table.dropColumn("event");
    });
};
