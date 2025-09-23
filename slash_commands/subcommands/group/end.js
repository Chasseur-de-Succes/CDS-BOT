const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { endGroup } = require("../../../util/msg/group");
const { CHECK_MARK } = require("../../../data/emojis.json");

const end = async (interaction, options) => {
    const grpName = options.get("nom")?.value;
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);

    // test si captain est register
    const authorDb = await client.getUser(author);
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
    const grp = await client.findGroupByName(grpName);
    if (!grp) {
        return interaction.reply({
            embeds: [createError(`Le groupe ${grpName} n'existe pas !`)],
        });
    }

    // Si l'auteur n'est pas admin et n'est pas capitaine
    if (!(isAdmin || grp.captain._id.equals(authorDb._id))) {
        return interaction.reply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe ${grp.name} !`),
            ],
        });
    }

    // si un seul participant
    if (grp.size === 1) {
        return interaction.reply({
            embeds: [
                createError(
                    `Tu es seul.e dans le groupe.. Utilise plutôt \`/group dissolve ${grp.name}\` !`,
                ),
            ],
        });
    }

    await client.update(grp, { validated: true });

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
        mentionsUsers += `<@${member.userId}> `;
    }

    // - MONEY
    // X = [[(Valeur du joueur de base (20)+ (5 par joueur supplémentaire)] X par le nombre de joueurs total inscrit]] + 50 par session
    const base = 20;
    const baseJoueur = 5;
    const baseSession = 50;
    const nbSession = grp.dateEvent.length;
    const nbJoueur = grp.size;
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
