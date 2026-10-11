const { createLogs } = require("../../../../util/envoiMsg");
const { TowerRepository } = require("../../../../repositories");

async function start(interaction) {
    const guildId = interaction.guildId;

    // si une tour est déjà en cours, on skip
    const currentTower = await TowerRepository.findCurrentSeason(guildId);
    if (currentTower) {
        return await interaction.reply({
            content: "Événement déjà commencé !",
        });
    }

    logger.info(".. lancement event tower");

    // nouvelle saison = dernière saison connue + 1 (0 si aucune)
    const latestTower = await TowerRepository.findLatestByGuildId(guildId);
    const season = latestTower ? latestTower.season + 1 : 0;

    await TowerRepository.create({
        guildId,
        season,
        start: new Date(),
        started: true,
        finished: false,
    });

    await createLogs(
        interaction.client,
        guildId,
        `🗼 TOWER : Saison ${season} commencée ✅`,
        `Évènement commencé par ${interaction.member} !`,
        "",
        "#DC8514",
    );

    return await interaction.reply({ content: "Événement commencé !" });
}

exports.start = start;
