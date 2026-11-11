/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.alterTable("TowerStats", (table) => {
        table.integer("nbValidatedGames").defaultTo(0).alter();
        table.integer("currentFloor").defaultTo(0).alter();
        table.integer("totalDamage").defaultTo(0).alter();
        table
            .specificType("completedGames", "varchar(255)[]")
            .defaultTo(knex.raw("ARRAY[]::varchar[]"))
            .alter();
    });

    // backfill des lignes existantes créées sans ces valeurs
    await knex("TowerStats")
        .whereNull("nbValidatedGames")
        .update({ nbValidatedGames: 0 });
    await knex("TowerStats")
        .whereNull("currentFloor")
        .update({ currentFloor: 0 });
    await knex("TowerStats")
        .whereNull("totalDamage")
        .update({ totalDamage: 0 });
    await knex.raw(
        `UPDATE "TowerStats" SET "completedGames" = ARRAY[]::varchar[] WHERE "completedGames" IS NULL`,
    );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.alterTable("TowerStats", (table) => {
        table.integer("nbValidatedGames").defaultTo(null).alter();
        table.integer("currentFloor").defaultTo(null).alter();
        table.integer("totalDamage").defaultTo(null).alter();
        table
            .specificType("completedGames", "varchar(255)[]")
            .defaultTo(null)
            .alter();
    });
};
