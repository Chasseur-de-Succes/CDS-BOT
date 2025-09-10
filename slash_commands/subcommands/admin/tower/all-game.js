const { createError } = require("../../../../util/envoiMsg");
const path = require("node:path");
const fs = require("node:fs");
const { Game } = require("../../../../models");

async function allGame(interaction, options) {
    const client = interaction.client;
    await interaction.deferReply();

    // récup l'utilisateur et test si register
    const user = options.getUser("user");
    const userDb = await client.getUser(user);
    if (!userDb) {
        // Si pas dans la BDD
        return interaction.editReply({
            embeds: [createError(`${user.tag} n'a pas encore de compte !`)],
        });
    }

    // si l'user n'est pas inscrit, on skip
    if (!userDb.event.tower.startDate) {
        return await interaction.editReply({
            content: "L'utilisateur n'est pas inscrit à l'événement !",
        });
    }

    // on récupère les jeux validés par l'utilisateur
    let games = `LISTE DES JEUX VALIDÉS PAR ${user.tag}:\n\n`;
    for (const appid of userDb.event.tower.completedGames) {
        const gameDb = await Game.findOne({ appid: appid });
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
