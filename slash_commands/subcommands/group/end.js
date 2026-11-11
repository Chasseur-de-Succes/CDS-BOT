const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { endGroup } = require("../../../util/msg/group");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { UserRepository, GroupRepository } = require("../../../repositories");

const end = async (interaction, options) => {
    const idGrp = options.get("nom")?.value;
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);

    // test si captain est register
    const authorDb = await UserRepository.findByDiscordId(author.id);
    if (!authorDb) {
        // Si pas dans la BDD
        return interaction.reply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    // Récupération du groupe
    const grp = await GroupRepository.findByIdWithRelations(idGrp);
    if (!grp) {
        return interaction.reply({
            embeds: [createError(`Le groupe n'existe pas !`)],
        });
    }

    // Si l'auteur n'est pas admin et n'est pas capitaine
    if (!(isAdmin || grp.captainUser.id === authorDb.id)) {
        return interaction.reply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe ${grp.name} !`),
            ],
        });
    }

    // si un seul participant
    if (grp.members.length === 1) {
        return interaction.reply({
            embeds: [
                createError(
                    `Tu es seul.e dans le groupe.. Utilise plutôt \`/group dissolve ${grp.name}\` !`,
                ),
            ],
        });
    }

    await GroupRepository.update(grp.id, { validated: true });

    // suppression du channel de discussion
    if (grp.channelId) {
        interaction.guild.channels.cache
            .get(grp.channelId)
            ?.delete("Groupe terminé");
    } else {
        logger.error(
            `Le channel de discussion du groupe : ${grpName} n'existe pas ! Channel id : ${grp.channelId}`,
        );
    }

    let mentionsUsers = "";
    for (const member of grp.members) {
        mentionsUsers += `<@${member.discordId}> `;
    }

    // - MONEY
    // X = [[(Valeur du joueur de base (20)+ (5 par joueur supplémentaire)] X par le nombre de joueurs total inscrit]] + 50 par session
    const base = 20;
    const baseJoueur = 5;
    const baseSession = 50;
    const nbSession = grp.dates?.length ?? 0;
    const nbJoueur = grp.members.length;
    const prize =
        (base + baseJoueur * nbJoueur) * nbJoueur + baseSession * nbSession;

    logger.info(`${author.user.tag} a validé le groupe ${grp.name}`);
    const newMsgEmbed = new EmbedBuilder()
        .setTitle(
            `${CHECK_MARK} Bravo ! Vous avez terminé l'évènement du groupe ${grp.name}`,
        )
        .setDescription(
            `Vous gagnez chacun **${prize}** ${process.env.MONEY} ! 💰`,
        );
    await interaction.reply({ content: mentionsUsers, embeds: [newMsgEmbed] });

    await endGroup(client, interaction.guildId, grp);
};

exports.end = end;
