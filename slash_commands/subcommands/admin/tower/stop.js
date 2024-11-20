const { GuildConfig } = require("../../../../models");
const { endSeasonForUser } = require("../../tower/valider-jeu");

async function stop(interaction) {
    const guild = await GuildConfig.findOne({
        guildId: interaction.guildId,
    });

    // si déjà stop, on skip
    if (!guild.event.tower.started) {
        return await interaction.reply({
            content: "Événement déjà arrêté !",
        });
    }
    logger.info(".. arrêt event tower");
    guild.event.tower.started = false;
    // on garde une trace
    guild.event.tower.history.push({
        season: guild.event.tower.currentSeason,
        startDate: guild.event.tower.startDate,
        endDate: Date.now(),
        finished: false,
    });

    await guild.save();

    // Récupérer tous les utilisateurs qui ont participé
    const season = guild.event.tower.currentSeason;
    const users = await User.find({
        "event.tower.startDate": { $exists: true },
    });

    // Sauvegarder les informations de la saison actuelle pour chaque utilisateur
    const endDate = Date.now();
    for (const user of users) {
        await endSeasonForUser(user, endDate, season);
    }
    return await interaction.reply({ content: "Événement arrêté !" });
}

exports.stop = stop;
