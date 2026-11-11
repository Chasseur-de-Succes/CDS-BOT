const { endSeason } = require("../../../../util/events/tower/towerUtils");
const { TowerRepository } = require("../../../../repositories");

async function stop(interaction) {
    // tour en cours (started = true)
    const currentTower = await TowerRepository.findCurrentSeason(
        interaction.guildId,
    );

    // si déjà stop, on skip
    if (!currentTower) {
        return await interaction.reply({
            content: "Évènement déjà arrêté !",
        });
    }
    logger.info(".. arrêt event tower");

    await endSeason(
        interaction.client,
        currentTower.season,
        interaction.guildId,
        true,
    );

    return await interaction.reply({ content: "Évènement arrêté !" });
}

exports.stop = stop;
