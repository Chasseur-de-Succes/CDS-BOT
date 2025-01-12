const { GuildConfig, User } = require("../../../../models");
const { endSeasonForUser } = require("../../tower/valider-jeu");
const { createLogs } = require("../../../../util/envoiMsg");
const { daysDiff } = require("../../../../util/util");

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

    createLogs(
        interaction.client,
        interaction.guildId,
        `🗼 TOWER : Saison ${season} arrêtée ❌`,
        `Évènement arrêté par ${interaction.member} !`,
        `Durée de ${daysDiff(guild.event.tower.startDate, Date.now())} jours`,
        "#DC8514",
    );

    // Sauvegarder les informations de la saison actuelle pour chaque utilisateur
    const endDate = Date.now();
    for (const user of users) {
        await endSeasonForUser(user, endDate, season);
    }
    return await interaction.reply({ content: "Évènement arrêté !" });
}

exports.stop = stop;
