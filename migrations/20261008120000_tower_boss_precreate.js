const { ENEMIES } = require("../data/event/tower/constants.json");

/**
 * Pré-création des boss de la saison courante pour chaque tour démarrée.
 * Les boss sont créés "cachés" (isDiscovered = false) et révélés au palier.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const towers = await knex("Tower").where({ started: true });

    for (const tower of towers) {
        const enemies = ENEMIES[String(tower.season)];

        // seules les saisons définies sous forme de tableau sont gérées
        if (!Array.isArray(enemies)) continue;

        const existing = await knex("TowerBoss")
            .where({ towerId: tower.id, season: tower.season })
            .count("* as c")
            .first();

        if (Number(existing.c) > 0) continue;

        await knex("TowerBoss").insert(
            enemies.map((enemy, index) => ({
                towerId: tower.id,
                name: enemy.name,
                hp: enemy.hp,
                maxHp: enemy.hp,
                season: tower.season,
                hidden: false,
                order: index,
                isDiscovered: false,
            })),
        );
    }
};

/**
 * Supprime les boss pré-créés encore intacts (non révélés, non tués, full PV).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    const towers = await knex("Tower").where({ started: true });

    for (const tower of towers) {
        await knex("TowerBoss")
            .where({
                towerId: tower.id,
                season: tower.season,
                isDiscovered: false,
                killedBy: null,
            })
            .whereColumn("hp", "maxHp")
            .del();
    }
};
