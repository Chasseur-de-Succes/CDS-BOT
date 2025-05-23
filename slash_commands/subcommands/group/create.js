const { createError } = require("../../../util/envoiMsg");
const { escapeRegExp } = require("../../../util/util");
const { Game, GuildConfig } = require("../../../models");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ComponentType,
    ChannelType,
    PermissionFlagsBits,
} = require("discord.js");
const { SALON } = require("../../../util/constants");
const { createGroup } = require("../../../util/msg/group");
const { NIGHT } = require("../../../data/colors.json");
const { CHECK_MARK } = require("../../../data/emojis.json");

const create = async (interaction, options) => {
    const nameGrp = options.get("nom")?.value;
    const nbMaxMember = options.get("max")?.value; // INTEGER
    const gameName = options.get("jeu")?.value;
    const description = options.get("description")?.value;
    const client = interaction.client;
    const captain = interaction.member;
    const guildId = interaction.guildId;

    // test si captain est register
    const captainDb = await client.getUser(captain);
    const nbGrps = await client.getNbOngoingGroups(captain.id);

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

    if (captainDb.warning >= 3) {
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

    // la regex test la taille mais pour l'utilisateur il vaut mieux lui dire d'où vient le pb
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
    const grp = await client.findGroupByName(nameGrp);
    if (grp) {
        return interaction.reply({
            embeds: [
                createError(
                    "Le nom du groupe existe déjà. Veuillez en choisir un autre.",
                ),
            ],
        });
    }

    // création de la regex sur le nom du jeu
    logger.info(`Recherche jeu Steam par nom : ${gameName}..`);
    const regGame = new RegExp(escapeRegExp(gameName), "i");

    // "recherche.."
    await interaction.deferReply();

    // récupère les jeux en base en fonction d'un nom, avec succès et Multi et/ou Coop
    const games = await Game.aggregate([
        {
            $match: { name: regGame },
        },
        {
            $match: { type: "game" },
        },
        {
            $limit: 25,
        },
    ]);

    logger.info(`.. ${games.length} jeu(x) trouvé(s)`);
    if (!games) {
        return interaction.editReply({
            embeds: [createError("Erreur lors de la recherche du jeu")],
        });
    }
    if (games.length === 0) {
        return interaction.editReply({
            embeds: [
                createError(`Pas de résultat trouvé pour **${gameName}** !`),
            ],
        });
    }

    // values pour Select Menu
    const items = [];
    for (const game of games) {
        if (game) {
            items.unshift({
                label: game.name,
                // description: 'Description',
                value: `${game.appid}`,
            });
        }
    }

    // SELECT n'accepte que 25 max
    // if (items.length > 25) return interaction.editReply({ embeds: [createError(`Trop de jeux trouvés ! Essaie d'être plus précis stp.`)] });

    // row contenant le Select menu
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`select-games-${captain}`)
            .setPlaceholder("Sélectionner le jeu..")
            .addOptions(items),
    );

    const embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle(
            `J'ai trouvé ${games.length} jeux, avec succès, en multi et/ou coop !`,
        )
        .setDescription("Lequel est celui que tu cherchais ?");

    const msgEmbed = await interaction.editReply({
        embeds: [embed],
        components: [row],
    });

    // attend une interaction bouton de l'auteur de la commande
    let filter;
    let itrSelect;
    try {
        filter = (i) => {
            i.deferUpdate();
            return i.user.id === interaction.user.id;
        };
        itrSelect = await msgEmbed.awaitMessageComponent({
            filter,
            componentType: ComponentType.StringSelect,
            time: 30000, // 5min
        });
    } catch (error) {
        await interaction.editReply({ components: [] });
        return;
    }
    // on enleve le select
    await interaction.editReply({ components: [] });

    const gameId = itrSelect.values[0];
    logger.info(`.. Steam app ${gameId} choisi`);
    // on recupere le custom id "APPID_GAME"
    const game = await client.findGameByAppid(gameId);

    const idDiscussionGroupe = await client.getGuildChannel(
        guildId,
        SALON.CAT_DISCUSSION_GROUPE,
    );
    const idDiscussionGroupe2 = await client.getGuildChannel(
        guildId,
        SALON.CAT_DISCUSSION_GROUPE_2,
    );
    let cat = await client.channels.cache.get(idDiscussionGroupe);
    const cat2 = await client.channels.cache.get(idDiscussionGroupe2);
    if (!cat) {
        logger.info(
            "Catégorie des discussions de groupe n'existe pas ! Création en cours...",
        );
        const nameCat = "Discussions groupes";
        cat = await createCategory(
            nameCat,
            SALON.CAT_DISCUSSION_GROUPE,
            interaction,
        );
    }

    if (cat.children.size >= 50) {
        // limite par Discord
        cat = cat2; // utiliser cat2 au lieu du 1
        if (!cat2) {
            logger.info(
                "Catégorie des discussions de groupe 2 n'existe pas ! Création en cours...",
            );
            const nameCat = "Discussion groupes 2";
            cat = await createCategory(
                nameCat,
                SALON.CAT_DISCUSSION_GROUPE_2,
                interaction,
            );
        }
    }

    // création channel de discussion
    const channel = await interaction.guild.channels.create({
        name: nameGrp,
        type: ChannelType.GuildText,
        parent: cat,
        permissionOverwrites: [
            {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: captain.id,
                allow: [
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ViewChannel,
                ],
            },
        ],
    });

    for (const devId of process.env.DEVELOPERS.split(",")) {
        channel.permissionOverwrites.edit(devId, {
            ViewChannel: true,
            SendMessages: true,
            MentionEveryone: true,
        });
    }

    channel.send(`Bienvenue dans le channel du groupe : ${nameGrp}`);
    channel.send(`> ${captain} a créé le groupe`);

    // creation groupe
    const newGrp = {
        name: nameGrp,
        desc: description,
        nbMax: nbMaxMember,
        captain: captainDb._id,
        members: [captainDb._id],
        game: game,
        channelId: channel.id,
    };
    createGroup(client, interaction.guildId, newGrp);

    const newMsgEmbed = new EmbedBuilder()
        .setTitle(`${CHECK_MARK} Le groupe **${nameGrp}** a bien été créé !`)
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
};

// Création catégorie discussions groupes
async function createCategory(nameCat, catConfig, interaction) {
    const cat = await interaction.guild.channels.create({
        name: nameCat,
        type: ChannelType.GuildCategory,
    });

    await GuildConfig.updateOne(
        { guildId: interaction.guildId },
        { $set: { [`channels.${catConfig}`]: cat.id } },
    );

    logger.info(`Catégorie "${nameCat}" créé avec succès`);
    return cat;
}

exports.create = create;
