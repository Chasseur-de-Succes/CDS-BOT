const { GuildConfig, User } = require("../../../../models");
const { endSeason } = require("../../../../util/events/tower/towerUtils");

async function stop(interaction) {
    const guild = await GuildConfig.findOne({
        guildId: interaction.guildId,
    });

    // si déjà stop, on skip
    if (!guild.event.tower.started) {
        return await interaction.reply({
            content: "Évènement déjà arrêté !",
        });
    }
    logger.info(".. arrêt event tower");

    const season = guild.event.tower.currentSeason;
    await endSeason(interaction.client, season, guild, true);

    return await interaction.reply({ content: "Évènement arrêté !" });
}

exports.stop = stop;
