const { createError } = require("../../../../util/envoiMsg");
const path = require("node:path");
const fs = require("node:fs");
const {
    UserRepository,
    GameRepository,
    TowerRepository,
    TowerStatsRepository,
} = require("../../../../repositories");

async function allGame(interaction, options) {
    await interaction.deferReply();

    // récup l'utilisateur et test si register
    const user = options.getUser("user");
    const userDb = await UserRepository.findByDiscordUser(user);
    if (!userDb) {
        // Si pas dans la BDD
        return interaction.editReply({
            embeds: [createError(`${user.tag} n'a pas encore de compte !`)],
        });
    }

    // saison en cours (via la ligne Tower)
    const currentTower = await TowerRepository.findCurrentSeason(
        interaction.guildId,
    );
    if (!currentTower) {
        return await interaction.editReply({
            content: "L'évènement n'a pas encore commencé !",
        });
    }

    // récup les stats tower de l'user pour la saison
    const towerStats = await TowerStatsRepository.findByUserAndSeason(
        userDb,
        currentTower.season,
    );
    if (!towerStats) {
        return await interaction.editReply({
            content: "L'utilisateur n'est pas inscrit à l'événement !",
        });
    }

    // on récupère les jeux validés par l'utilisateur
    let games = `LISTE DES JEUX VALIDÉS PAR ${user.tag}:\n\n`;
    for (const appid of towerStats.completedGames ?? []) {
        const gameDb = await GameRepository.findByAppid(appid);
        if (!gameDb) {
            games += `- Jeu introuvable dans la base (${appid})\n`;
        } else {
            games += `- ${gameDb.name} (${gameDb.appid})\n`;
        }
    }

    // Définir un chemin pour le fichier contenant les jeux (plutôt que de les envoyer dans le chat)
    const filePath = path.join(__dirname, `games_${user.tag}.txt`);
    fs.writeFileSync(filePath, games);

    interaction
        .editReply({
            files: [filePath],
        })
        .then(() => {
            fs.unlinkSync(filePath); // Supprimer le fichier après envoi
        });
}

exports.allGame = allGame;
