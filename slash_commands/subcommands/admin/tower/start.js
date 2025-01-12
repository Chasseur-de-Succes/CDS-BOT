const { GuildConfig } = require("../../../../models");
const { createLogs } = require("../../../../util/envoiMsg");
const { daysDiff } = require("../../../../util/util");

async function start(interaction) {
    const guild = await GuildConfig.findOne({
        guildId: interaction.guildId,
    });

    // si déjà start, on skip
    if (guild.event.tower.started) {
        return await interaction.reply({
            content: "Événement déjà commencé !",
        });
    }
    logger.info(".. lancement event tower");
    guild.event.tower.started = true;
    guild.event.tower.startDate = Date.now();

    if (typeof guild.event.tower.currentSeason === "undefined") {
        guild.event.tower.currentSeason = 0;
    } else {
        guild.event.tower.currentSeason++;
    }

    await guild.save();

    createLogs(
        interaction.client,
        interaction.guildId,
        `🗼 TOWER : Saison ${guild.event.tower.currentSeason} commencée ✅`,
        `Évènement commecé par ${interaction.member} !`,
        "",
        "#DC8514",
    );
    return await interaction.reply({ content: "Événement commencé !" });
}

exports.start = start;
