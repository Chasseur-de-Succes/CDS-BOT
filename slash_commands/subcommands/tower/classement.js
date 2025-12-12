const { User, GuildConfig } = require("../../../models");
const { EmbedBuilder } = require("discord.js");
const { CDS } = require("../../../data/emojis.json");

const classement = async (interaction, options) => {
    // TODO option pour afficher le classement d'un joueur précis ?
    const client = interaction.client;
    const guildId = interaction.guildId;
    const crtUser = interaction.user;
    const dbUser = await client.findUserById(crtUser.id);
    const guild = await GuildConfig.findOne({ guildId: guildId });

    let season = options.getInteger("saison");
    season = season === null ? guild.event.tower.currentSeason : season;
    const isCurrentSeason = season === guild.event.tower.currentSeason;

    logger.info(
        `[TOWER] ${interaction.user.tag} consulte le classement de la saison ${season} (saison en cours: ${guild.event.tower.currentSeason})`,
    );

    await interaction.deferReply({ ephemeral: true });

    // Récupérer les utilisateurs ayant participé à la saison donnée
    const users = isCurrentSeason
        ? await User.find({ "event.tower.season": season })
        : await User.find({
              "event.tower.seasonHistory": {
                  $elemMatch: { seasonNumber: season },
              },
          });

    if (users.length === 0) {
        return interaction.editReply({
            content: `Aucun classement n'est disponible pour la saison ${season}..`,
            ephemeral: true,
        });
    }

    // Trier les utilisateurs par maxEtage pour la saison donnée
    const leaderboard = users
        .map((user) => {
            const maxEtage = isCurrentSeason
                ? user.event.tower.etage
                : user.event.tower.seasonHistory.find(
                      (s) => s.seasonNumber === season,
                  )?.maxEtage;
            return {
                userId: user.userId,
                maxEtage: maxEtage || 0,
            };
        })
        .sort((a, b) => b.maxEtage - a.maxEtage);

    // Trouver la position de l'utilisateur courant
    const userIndex = leaderboard.findIndex(
        (entry) => entry.userId === interaction.user.id,
    );
    const positionsUserCourant = userIndex !== -1 ? userIndex + 1 : undefined;
    const degatsUserCourant =
        userIndex !== -1 ? leaderboard[userIndex].maxEtage : undefined;

    // Limiter aux 10 premiers pour l'affichage
    const top10 = leaderboard.slice(0, 10);

    // Générer les données pour l'embed
    let positions = "**";
    let joueurs = "";
    let degats = "**";
    let i = 1;

    for (const entry of top10) {
        const discordUser = await client.users.fetch(entry.userId);
        positions += `${i} - \n`;
        joueurs += `${discordUser}\n`;
        degats += `${entry.maxEtage}\n`;
        i++;
    }
    positions += "**";
    degats += "**";

    let messageFooter;
    if (typeof positionsUserCourant === "undefined") {
        messageFooter = "Tu n'as pas participé à cette saison.";
    } else {
        messageFooter = `Toi tu es ${positionsUserCourant}ème avec ${degatsUserCourant} étages.`;
    }

    // Créer un embed contenant le classement
    const embed = new EmbedBuilder()
        .setTitle(`Saison ${season}`)
        .setDescription("Classement des joueurs pour cette saison.")
        .addFields(
            { name: "🏁", value: positions, inline: true },
            { name: `${CDS}`, value: joueurs, inline: true },
            { name: "🏆", value: degats, inline: true },
        )
        .setFooter({
            text: messageFooter,
        });

    return interaction.editReply({ embeds: [embed], ephemeral: true });
};

exports.classement = classement;
