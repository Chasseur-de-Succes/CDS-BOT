const { User, GuildConfig } = require("../../../models");
const { EmbedBuilder } = require("discord.js");
const { CDS } = require("../../../data/emojis.json");
const { TowerRepository, UserRepository } = require("../../../repositories");
const { Tower } = require("../../../models/objection");
const { createError } = require("../../../util/envoiMsg");

const classement = async (interaction, options) => {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const currentTower = await TowerRepository.findCurrentSeason(guildId);
    // soit saison donnée en option, sinon saison courante
    const season = options.getInteger("saison") ?? currentTower.season;
    // si pas de saison en cours
    if (!season) {
        // TODO
    }

    const authorDb = await UserRepository.findByDiscordUser(interaction.user);
    if (!authorDb) {
        // Si pas dans la BDD
        return interaction.reply({
            embeds: [
                createError(
                    `${interaction.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    const isCurrentSeason = season === currentTower.season;

    logger.info(
        `[TOWER] ${interaction.user.tag} consulte le classement de la saison ${season} (saison en cours: ${currentTower.season})`,
    );

    await interaction.deferReply({ ephemeral: true });

    // Récupérer le top10 des utilisateurs ayant participé à la saison donnée
    const top10 = await TowerRepository.findTop10UsersBySeason(season);

    if (top10.length === 0) {
        return interaction.editReply({
            content: `Aucun classement n'est disponible pour la saison ${season}..`,
            ephemeral: true,
        });
    }

    // Trouver la position de l'utilisateur courant
    const rankingCurrentUser = await TowerRepository.findRankingForSeason(season, authorDb);
    const positionsUserCourant = rankingCurrentUser ? rankingCurrentUser.rank : undefined;
    const degatsUserCourant = rankingCurrentUser ? rankingCurrentUser.totalDamage : undefined;

    // Générer les données pour l'embed
    let positions = "**";
    let joueurs = "";
    let degats = "**";
    let i = 1;

    for (const entry of top10) {
        const discordUser = await client.users.fetch(entry.user.discordId);
        positions += `${i} - \n`;
        joueurs += `${discordUser}\n`;
        degats += `${entry.totalDamage}\n`;
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
