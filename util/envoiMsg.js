const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { DARK_RED, CORNFLOWER_BLUE, GREEN } = require("../data/colors.json");
const { CROSS_MARK } = require("../data/emojis.json");
const { SALON } = require("./constants");
const path = require("node:path");
const fs = require("node:fs");

/* Nourri feed bot - Lvl Up */
module.exports.feedBotLevelUp = async (
    client,
    guildId,
    user,
    userDb,
    nextPalier,
) => {
    const idFeedBot = await client.getGuildChannel(guildId, SALON.FEED_BOT);
    const feed = await client.channels.cache.get(idFeedBot);

    if (feed) {
        const embedLvlUp = new EmbedBuilder()
            .setColor(GREEN)
            .setTitle("🥳 Félicitations ! 🥳")
            .setDescription(
                `${user} a atteint le niveau **${userDb.level + 1}** !`,
            )
            .setFooter({
                text: `Prochain niveau : ${userDb.experience} / ${nextPalier}`,
            });

        await feed.send({ embeds: [embedLvlUp] });
    } else {
        logger.warn("Salon feed bot non configuré..");
    }
};

/* Nourri feed bot - Meta Succès */
module.exports.feedBotMetaAch = async (client, guildId, user, achievement) => {
    const idFeedBot = await client.getGuildChannel(guildId, SALON.FEED_BOT);
    const feed = await client.channels.cache.get(idFeedBot);

    if (feed) {
        const embedAch = new EmbedBuilder()
            .setColor(CORNFLOWER_BLUE)
            .setTitle("🏆 Succès débloqué 🏆")
            .setDescription(`${user} a débloqué :`)
            .addFields({
                name: `${achievement.title}`,
                value: `*${achievement.desc}*`,
            });

        const file = new AttachmentBuilder(
            `data/img/achievements/${achievement.img}.png`,
        );
        embedAch.setThumbnail(`attachment://${achievement.img}.png`);

        await feed.send({ embeds: [embedAch], files: [file] });
    } else {
        logger.warn("Salon feed bot non configuré..");
    }

    // - log
    this.createLogs(
        client,
        guildId,
        "🏆 Succès interne débloqué",
        `${user} a débloqué :\n
        ***${achievement.title}*** :\n*${achievement.desc}*`,
        "",
        CORNFLOWER_BLUE,
    );
};

/**
 * Créer un embed de type ERREUR
 * @param {*} text le texte a afficher
 * @returns un MessageEmbed
 */
module.exports.createError = (text) => {
    return new EmbedBuilder()
        .setColor(DARK_RED)
        .setDescription(`${CROSS_MARK} • ${text}`);
};

/**
 * Envoie un message d'erreur
 * @param {*} message objet Discord, va envoyé le message dans le même channel
 * @param {*} text le message
 * @param {*} cmd le nom de la commande qui a exécuté cet envoi
 * @returns
 */
module.exports.sendError = (message, text, cmd) => {
    const embedError = this.createError(text);
    logger.error(`${message.author.username} - ${cmd} : ${text}`);
    return message.channel.send({ embeds: [embedError] });
};

/**
 * Envoie un message dans le channel de log
 * @param {*} client objet Discord, va envoyer le message dans le channel
 * @param {*} embedLog
 * @returns
 */
module.exports.sendLogs = async (client, guildId, embedLog) => {
    const idLogs = await client.getGuildChannel(guildId, SALON.LOGS);
    if (idLogs) {
        await client.channels.cache.get(idLogs).send({ embeds: [embedLog] });
    } else {
        logger.error("- Config salon logs manquante !");
    }
};

/**
 * Créé un log (embed) prédéfini
 * @param {*} client objet Discord, va envoyé le message dans le channel
 * @param {*} guildId id de la guilde
 * @param {*} title le titre
 * @param {*} desc le msg du log
 * @param {*} footer facultatif (defaut '')
 * @param {*} color facultatif (defaut DARK_RED)
 * @returns
 */
module.exports.createLogs = async (
    client,
    guildId,
    title,
    desc,
    footer = "",
    color = DARK_RED,
) => {
    const embedLog = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${title}`)
        .setDescription(desc);

    if (footer) {
        embedLog.setFooter({ text: footer });
    }
    await this.sendLogs(client, guildId, embedLog);
};

/**
 * Créer un embed
 * @param option {Object} - Options de l'embed
 * @returns
 */
module.exports.createEmbed = async (option) => {
    return new EmbedBuilder()
        .setTitle(option.title)
        .setDescription(option.desc)
        .setColor(option.color)
        .setURL(option.url)
        .setFooter(option.footer);
};

/**
 * Envoie un message d'erreur dans le salon dédié des discodeurs
 * @param client
 * @param error
 * @param title
 */
module.exports.sendStackTrace = (client, error, title) => {
    // Définir un chemin pour le fichier d'erreur
    const filePath = path.join(__dirname, "error-log.txt");
    fs.writeFileSync(
        filePath,
        `Message: ${error.message}\nStack Trace:\n${error.stack}`,
    );

    const errorEmbed = new EmbedBuilder()
        .setTitle(title)
        .setColor("#FF0000")
        .addFields({
            name: "Message",
            value: `\`\`\`${error.message}\`\`\``,
        })
        .setTimestamp();

    const errorChannel = client.channels.cache.get(
        `${process.env.ERROR_CHANNEL}`,
    );
    if (errorChannel) {
        errorChannel
            .send({ embeds: [errorEmbed] }) // envoie l'embed
            .then(errorChannel.send({ files: [filePath] })) // puis le fichier
            .then(() => fs.unlinkSync(filePath)) // Supprimer le fichier après envoi
            .catch(console.error);
    }
};
