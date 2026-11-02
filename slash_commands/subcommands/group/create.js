const { createError } = require("../../../util/envoiMsg");
const {
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits,
} = require("discord.js");
const { NEW_SALON, DISCORD_LIMITS } = require("../../../util/constants");
const { createGroup } = require("../../../util/msg/group");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { UserRepository, GroupRepository, GameRepository, GuildConfigRepository } = require("../../../repositories");

const create = async (interaction, options) => {
    const nameGrp = options.get("nom")?.value;
    const nbMaxMember = options.getInteger("max")?.value; // INTEGER
    const gameAppid = options.get("jeu")?.value;
    const description = options.get("description")?.value;
    const client = interaction.client;
    const captain = interaction.member;
    const guildId = interaction.guildId;

    // test si captain est register
    const captainDb = await UserRepository.findByDiscordUser(captain.user);
    const nbGrps = await GroupRepository.countOngoingByMember(captainDb);

    if (!captainDb) {
        // Si pas dans la BDD
        return interaction.reply({
            embeds: [
                createError(
                    `${captain.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    if (captainDb.nbWarning >= 3) {
        return interaction.reply({
            embeds: [
                createError(
                    `Tu n'as pas le droit de créer de nouveau groupe pour le moment !`,
                ),
            ],
        });
    }

    if (nbGrps >= process.env.MAX_GRPS) {
        return interaction.reply({
            embeds: [createError("Tu as rejoins trop de groupes !")],
        });
    }

    // la regex test la taille, mais pour l'utilisateur, il vaut mieux lui dire d'où vient le pb
    if (nameGrp.length < 3) {
        return interaction.reply({
            embeds: [
                createError(
                    `Le nombre **minimum** de caractères pour le nom d'un groupe est de **3**`,
                ),
            ],
        });
    }

    // si nom groupe existe
    if (await GroupRepository.existsByName(nameGrp)) {
        return interaction.reply({
            embeds: [
                createError(
                    "Le nom du groupe existe déjà. Veuillez en choisir un autre.",
                ),
            ],
        });
    }

    // "recherche.."
    await interaction.deferReply();

    logger.info(`.. Steam app ${gameAppid} choisi`);
    // on récupère le custom id "APPID_GAME"
    const game = await GameRepository.findByAppid(gameAppid);

    let channel;
    try {
        // obtention du channel de discussion
        const category = await getAvailableDiscussionCategory(
            client,
            interaction,
            guildId,
        );

        // pour les devs
        const devIds = process.env.DEVELOPERS.split(",")
            .map(id => id.trim())
            .filter(Boolean);

        // On prépare le tableau des permissions
        const overwrites = [
            // Bloquer l'accès à tout le monde
            {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            // Accès pour le capitaine
            {
                id: captain.id,
                allow: [
                    PermissionFlagsBits.PinMessages,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ViewChannel,
                ],
            },
            // Ajout des permissions pour les développeurs
            ...devIds.map(devId => ({
                id: devId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.MentionEveryone,
                ],
            })),
        ];

        // Création du salon
        const channel = await interaction.guild.channels.create({
            name: nameGrp,
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: overwrites,
        });

        channel.send(`Bienvenue dans le channel du groupe : ${nameGrp}`);
        channel.send(`> ${captain} a créé le groupe`);
        // TODO ajouter la description + info jeu + pin

        // creation groupe
        const newGrp = {
            guildId: interaction.guild.id,
            name: nameGrp,
            desc: description,
            nbMax: nbMaxMember,
            captain: captainDb,
            members: [captainDb],
            game: game,
            channelId: channel.id,
        };
        await createGroup(client, interaction.guildId, newGrp);

        const newMsgEmbed = new EmbedBuilder()
            .setTitle(
                `${CHECK_MARK} Le groupe **${nameGrp}** a bien été créé !`,
            )
            .addFields(
                { name: "Jeu", value: `${game.name}`, inline: true },
                { name: "Capitaine", value: `${captain}`, inline: true },
            );

        if (nbMaxMember) {
            newMsgEmbed.addFields({
                name: "Nb max joueurs",
                value: `${nbMaxMember}`,
                inline: true,
            });
        }

        await interaction.editReply({ embeds: [newMsgEmbed] });
    } catch (error) {
        logger.error("Erreur lors de la création du groupe : ", error);

        if (channel) {
            await channel
                .delete(
                    "Rollback suite à une erreur lors de la création du groupe",
                )
                .catch((err) => {
                    logger.error(
                        "Impossible de supprimer le salon après erreur : ",
                        err,
                    );
                });
        }

        if (error.code === "CATEGORY_FULL") {
            return interaction.editReply({
                embeds: [
                    createError(
                        `Impossible de créer le groupe : toutes les catégories sont pleines.`,
                    ),
                ],
            });
        }

        await interaction.editReply({
            embeds: [
                createError(
                    `Une erreur est survenue lors de la création du groupe. Contacter un développeur si le problème persiste.`,
                ),
            ],
            ephemeral: true,
        });
    }
};

// Obtention de la catégorie de discussion de groupe
async function getAvailableDiscussionCategory(client, interaction, guildId) {
    const idDiscussionGroupe = await GuildConfigRepository.getChannel(guildId, NEW_SALON.CAT_DISCUSSION_GROUPE);
    const idDiscussionGroupe2 = await GuildConfigRepository.getChannel(guildId, NEW_SALON.CAT_DISCUSSION_GROUPE_2);

    const configs = [
        [idDiscussionGroupe, "Discussions groupes"],
        [idDiscussionGroupe2, "Discussions groupes 2"],
    ];

    for (const [id, name] of configs) {
        const category = await getOrCreateCategory(
            client,
            interaction,
            id,
            name,
        );

        if (
            category.children.cache.size < DISCORD_LIMITS.CHANNELS_PER_CATEGORY
        ) {
            return category;
        }
    }

    const error = new Error(
        "Toutes les catégories de discussion sont pleines.",
    );
    error.code = "CATEGORY_FULL";
    throw error;
}

// Obtention ou création de la catégorie des discussions de groupes
async function getOrCreateCategory(
    client,
    interaction,
    salonId,
    name,
) {
    let category = client.channels.cache.get(salonId);

    if (!category) {
        logger.info(
            `La catégorie "${name}" n'existe pas, création en cours...`,
        );
        category = await createCategory(interaction, salonId, name);
    }

    return category;
}

// Création catégorie discussions groupes
async function createCategory(interaction, catConfig, nameCat) {
    const cat = await interaction.guild.channels.create({
        name: nameCat,
        type: ChannelType.GuildCategory,
    });

    await GuildConfigRepository.setChannel(interaction.guildId, catConfig, cat.id);

    logger.info(`Catégorie "${nameCat}" créé avec succès`);
    return cat;
}

exports.create = create;
