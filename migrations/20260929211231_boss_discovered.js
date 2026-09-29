/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable("TowerBoss", (table) => {
      table.boolean("isDiscovered").defaultTo(false);
  });

  // par defaut false, mais ceux qu'on a actuellement en bdd est à true
  await knex('TowerBoss').update({ isDiscovered: true });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.alterTable("TowerBoss", (table) => {
        table.dropColumn("isDiscovered");
    })
};
