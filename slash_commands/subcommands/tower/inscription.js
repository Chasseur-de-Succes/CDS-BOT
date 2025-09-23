const { Colors, EmbedBuilder } = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { GuildConfig } = require("../../../models");
const { ASCII_INTRO } = require("../../../data/event/tower/constants.json");
const { SALON } = require("../../../util/constants");

const inscription = async (interaction, options) => {
    // Récupération du channel de l'event
    const eventChannelId = await interaction.client.getGuildChannel(
        interaction.guild.id,
        SALON.EVENT_TOWER,
    );

    // Gestion d'erreur si aucun salon n'est défini
    if (!eventChannelId) {
        return interaction.reply({
            content: `Aucun salon de l'événement tower n'a été trouvé.`,
            ephemeral: true,
        });
    }

    const eventChannel = interaction.client.channels.cache.get(eventChannelId);
    const author = interaction.member;
    const client = interaction.client;
    const guildId = interaction.guildId;
    const guild = await GuildConfig.findOne({ guildId: guildId });

    // test si auteur est register
    const userDb = await client.getUser(author);
    if (!userDb) {
        // Si pas dans la BDD
        return interaction.reply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    // si la saison n'a pas encore commencé (à faire manuellement via commande '/admin tower start')
    if (!guild.event.tower.started) {
        logger.info(".. événement tower pas encore commencé");
        return await interaction.reply({
            embeds: [createError("L'événement n'a pas encore commencé..")],
        });
    }

    // si déjà inscrit
    if (userDb.event.tower.startDate) {
        return await interaction.reply({
            content: "Tu es déjà inscrit !",
            ephemeral: true,
        });
    }

    // Récupère le role Participant, le créer sinon
    const role = interaction.guild.roles.cache.find(
        (r) => r.name === "Grimpeur",
    );
    if (!role) {
        logger.info(".. rôle 'Grimpeur' pas encore créé, création ..");
        await interaction.guild.roles.create({
            name: "Grimpeur",
            color: Colors.Green,
            permissions: [],
        });
    }

    // Saison et date de commencement de l'événement par l'user
    userDb.event.tower.season = guild.event.tower.currentSeason;
    userDb.event.tower.startDate = Date.now();
    await userDb.save();

    // Pas besoin de tester si le rôle est déjà ajouté
    await author.roles.add(
        role ||
            interaction.guild.roles.cache.find((r) => r.name === "Grimpeur"),
    );
    logger.info(
        `.. ${author.nickname} s'est inscrit et a eu le rôle 'Grimpeur' ..`,
    );

    const embed = new EmbedBuilder()
        .setColor("#0019ff")
        .setTitle("☑️ Inscription validée")
        .setDescription(`Tu aperçois au loin une tour, tu décides de t'en approcher.
  Tu entends de sinistres ricanements provenant du sommet.
  Pour surmonter ta peur et commencer ton ascension, tu as besoin d'énergie..

  Peut-être en prouvant tes capacités à \`maîtriser\` un jeu puis en le \`validant\` ?
  ${ASCII_INTRO}
  On se retrouve par ici : ${eventChannel}
`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
};

exports.inscription = inscription;
