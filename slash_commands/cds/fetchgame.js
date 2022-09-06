const { MessageEmbed } = require('discord.js');

const { MESSAGES, TAGS } = require("../../util/constants");
const { CHECK_MARK, CROSS_MARK } = require("../../data/emojis.json");
const { GREEN } = require("../../data/colors.json");
const { MONEY } = require('../../config');
const { createError, createLogs, sendError } = require('../../util/envoiMsg');
const { Game } = require('../../models');

module.exports.run = async (interaction) => {
    const appId = interaction.options.get('appid')?.value;
    const client = interaction.client;
    const author = interaction.member;
    let user = interaction.user;
    let member;
    
    const app = await client.getAppDetails(appId);

    if (!app?.body[appId]?.data) {
        return interaction.reply({ embeds: [createError(`Jeu introuvable !`)] });
    }

    const gameName = app?.body[appId]?.data?.name
    let tags = app?.body[appId]?.data?.categories
    // au cas où pas de tags ou undefined
    tags = tags ? tags : [];
    // on ne garde que les tags qui nous intéresse (MULTI, COOP et ACHIEVEMENTS)
    // TODO voir pour faire autrement ? récupérer tous les tags peu importe et faire recherche sur les tags via Mongo ?
    let isMulti = tags.some(tag => tag.id === TAGS.MULTI.id);
    let isCoop = tags.some(tag => tag.id === TAGS.COOP.id);
    let hasAchievements = tags.some(tag => tag.id === TAGS.ACHIEVEMENTS.id);

    // TODO icon plutot que l'image ? -> recup via API..
    const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`;

    const query = { appid: appId };
    const update = {
        name: gameName,
        isMulti: isMulti,
        isCoop: isCoop,
        hasAchievements: hasAchievements
    };
    // on update ou créé le jeu
    await Game.findOneAndUpdate(query, update, { upsert: true });

    const msgCustom = `Jeu trouvé et mis à jour !`;

    logger.info(`${user.tag} a maj le jeu ${gameName}`);
    //createLogs(client, interaction.guildId, `${gameName}`, `${msgCustom}`, '', GREEN)

    const embed = new MessageEmbed()
        .setColor(GREEN)
        .setTitle(gameName)
        .setDescription(`${msgCustom}`)
        .setThumbnail(gameUrlHeader)
        .addFields(
            { name: '🌐 Multi', value: isMulti ? CHECK_MARK : CROSS_MARK, inline: true },
            { name: '🤝 Co-op', value: isCoop ? CHECK_MARK : CROSS_MARK, inline: true },
            { name: '🏆 Succès', value: hasAchievements ? CHECK_MARK : CROSS_MARK, inline: true },
            // TODO ajouter lien Steam, ASTATS, CME etc
        )
        .setFooter({ text: `par ${user.tag}`});
    
    return interaction.reply({ embeds: [embed] });
}

module.exports.help = MESSAGES.COMMANDS.CDS.FETCHGAME;