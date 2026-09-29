const { EmbedBuilder } = require("discord.js");
const {
    displayHealth,
    getRandomPrivateJokes,
} = require("../../../util/events/tower/towerUtils");
const { TowerRepository } = require("../../../repositories");

const infoBoss = async (interaction, options) => {
    const guildId = interaction.guildId;
    const currentTower = await TowerRepository.findCurrentSeason(guildId);
    const season = currentTower.season;
    if (typeof season === "undefined") {
        return interaction.reply({
            content: "Aucune saison en cours.",
            ephemeral: true,
        });
    }

    // Récupère le boss courant non mort
    const currentBoss = await TowerRepository.findCurrentBoss(currentTower.id, currentTower.season);
    if (!currentBoss) {
        return interaction.reply({
            content: "Aucun boss n'est actif actuellement.",
            ephemeral: true,
        });
    }

    const description = `**Nom :** ${currentBoss.name}`;

    const embed = new EmbedBuilder()
        .setTitle("Information sur le boss courant")
        .setDescription(description)
        .setColor("#fffb00")
        .setFooter({
            text: `${getRandomPrivateJokes()}`,
        });
    embed.addFields({
        name: `${currentBoss.hp}/${currentBoss.maxHp}`,
        value: `${displayHealth(currentBoss)}`,
    });

    return interaction.reply({
        embeds: [embed],
    });
};

exports.infoBoss = infoBoss;
