const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { CHECK_MARK } = require("../../../data/emojis.json");

const play = async (interaction, options) => {
    const author = interaction.member;
    const client = interaction.client;

    await interaction.deferReply();

    const userDb = await client.getUser(author);
    if (!userDb) {
        // Si pas dans la BDD
        return await interaction.editReply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    const steamId = userDb.steamId;
    const games = await client.getOwnedGames(steamId);

    if (!games || games.length === 0) {
        return await interaction.editReply({
            embeds: [
                createError(
                    `Aucun jeu trouvé. Le profil est probablement privé !`,
                ),
            ],
        });
    }

    const gameCount = games.length;
    const randomIndex = Math.floor(Math.random() * gameCount);
    const randomGame = games[randomIndex];

    const embed = new EmbedBuilder()
        .setTitle("Roulette")
        .setDescription("La roulette n'est pas encore prête ! ")
        .addFields({ name: "random game", value: `${randomGame.name}` });
    return interaction.editReply({ embeds: [embed] });
};

exports.play = play;
