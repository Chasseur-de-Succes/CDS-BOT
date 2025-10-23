const { TowerBoss, GuildConfig } = require("../../../models");
const { EmbedBuilder } = require("discord.js");
const { displayHealth, getRandomPrivateJokes } = require("../../../util/events/tower/towerUtils");

const infoBoss = async (interaction, options) => {
    const guildId = interaction.guildId;
    const guild = await GuildConfig.findOne({ guildId: guildId });
    const season = guild.event.tower.currentSeason;
    if (typeof season === "undefined" || !guild.event.tower.started) {
        return interaction.reply({
            content: "Aucune saison en cours.",
            ephemeral: true,
        });
    }

    // Récupère le boss courant non mort
    const currentBoss = await TowerBoss.findOne({
        season: season,
        hp: { $ne: 0 },
    });
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
