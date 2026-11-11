const { createError } = require("../../../../util/envoiMsg");
const {
    UserRepository,
    TowerRepository,
    TowerStatsRepository,
} = require("../../../../repositories");

async function down(interaction, options) {
    const guildId = interaction.guildId;
    const author = interaction.member;

    // récup l'utilisateur et test si register
    const user = options.getUser("user");
    const userDb = await UserRepository.findByDiscordUser(user);
    if (!userDb) {
        // Si pas dans la BDD
        return interaction.reply({
            embeds: [
                createError(
                    `${user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    // saison en cours (via la ligne Tower)
    const currentTower = await TowerRepository.findCurrentSeason(guildId);
    if (!currentTower) {
        return await interaction.reply({
            content: "Événement déjà arrêté !",
        });
    }

    // l'utilisateur doit être inscrit à la saison en cours
    const towerStats = await TowerStatsRepository.findByUserAndSeason(
        userDb,
        currentTower.season,
    );
    if (!towerStats) {
        return await interaction.reply({
            content: "L'utilisateur n'est pas inscrit à l'événement !",
        });
    }

    // on enlève un étage à l'utilisateur
    if (towerStats.currentFloor > 0) {
        logger.info(`${author.user.tag} a enlevé **1** étage à ${user.tag} ..`);
        await TowerStatsRepository.decrementCurrentFloor(
            userDb,
            currentTower.season,
        );
        return await interaction.reply({
            content: `${user.tag} a bien descendu d'un étage !`,
        });
    }

    return await interaction.reply({
        content: `${user.tag} est déjà au rez-de-chaussée.`,
    });
}

exports.down = down;
