const { Colors, EmbedBuilder } = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { GuildConfig } = require("../../../models");
const { MESSAGE } = require("../../../data/event/tower/constants.json");
const { SALON, NEW_SALON } = require("../../../util/constants");
const { GuildConfigRepository, UserRepository, TowerRepository, TowerStatsRepository } = require("../../../repositories");

const inscription = async (interaction, options) => {
    // Récupération du channel de l'event
    const guildId = interaction.guildId;
    const eventChannelId = await GuildConfigRepository.getChannel(guildId, NEW_SALON.EVENT_TOWER);

    // Gestion d'erreur si aucun salon n'est défini
    if (!eventChannelId) {
        return interaction.reply({
            content: `Aucun salon de l'événement tower n'a été trouvé.`,
            ephemeral: true,
        });
    }

    const eventChannel = interaction.client.channels.cache.get(eventChannelId);
    const author = interaction.member;
    const guild = await GuildConfig.findOne({ guildId: guildId });

    // test si auteur est register
    const userDb = await UserRepository.findByDiscordUser(interaction.user);
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

    const currentTower = await TowerRepository.findCurrentSeason(guildId);
    const season = currentTower.season;

    // si la saison n'a pas encore commencé (à faire manuellement via commande '/admin tower start')
    if (typeof season === "undefined") {
        logger.info(".. événement tower pas encore commencé");
        return await interaction.reply({
            embeds: [createError("L'événement n'a pas encore commencé..")],
        });
    }

    // si déjà inscrit
    const userFound = await TowerStatsRepository.findByUserAndSeason(userDb, season);
    if (userFound) {
        return await interaction.reply({
            content: "Tu es déjà inscrit !",
            ephemeral: true,
        });
    }

    // Récupère le role Participant, le créer sinon
    // TODO nom différent entre chaque saison
    // TODO supprimer à la fin de l'event automatiquement ou manuellement ?
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
    const newTowerStat = {
        userId: userDb.id,
        season: season,
        startDate: new Date(),
    }
    await TowerStatsRepository.create(newTowerStat);

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
        .setDescription(`${MESSAGE[season].INTRO}
  On se retrouve par ici : ${eventChannel}
`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
};

exports.inscription = inscription;
