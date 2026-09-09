/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.raw(`
        DELETE FROM "Achievement" a
        USING "Achievement" b
        WHERE a.id > b.id
          AND a.appid = b.appid
          AND a."apiName" = b."apiName"
          AND a."apiName" IS NOT NULL
    `);

    await knex.schema.alterTable("Achievement", (table) => {
        table.unique(
            ["appid", "apiName"],
            {
                indexName: "achievement_appid_apiname_unique"
            },
        );
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.alterTable("Achievement", (table) => {
        table.dropUnique(
            ["appid", "apiName"],
            "achievement_appid_apiname_unique",
        );
    });
};
