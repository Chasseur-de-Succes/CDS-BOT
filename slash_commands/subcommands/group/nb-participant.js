const { createError, sendLogs } = require("../../../util/envoiMsg");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { Group } = require("../../../models");
const { editMsgHubGroup } = require("../../../util/msg/group");
const { CHECK_MARK } = require("../../../data/emojis.json");

const editNbParticipant = async (interaction, options) => {
    const grpName = options.get("nom")?.value;
    const nbMax = options.get("max")?.value;
    const client = interaction.client;
    const author = interaction.member;

    // Test si le capitaine est inscrit
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
            embeds: [createError(`Le groupe **${grpName}** n'existe pas !`)],
        });
    }

    // Si l'auteur n'est pas capitaine ou non admin
    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin && !grp.captain._id.equals(authorDb._id)) {
        return interaction.reply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe **${grpName}** !`),
            ],
        });
    }

    if (nbMax > 0) {
        await client.update(grp, { nbMax: nbMax });
    } else {
        await Group.updateMany({ _id: grp._id }, { $unset: { nbMax: 1 } });
    }

    // Update message
    await editMsgHubGroup(client, interaction.guildId, grp);
    logger.info(
        `${author.user.tag} vient de modifier le nb de membres max par ${nbMax} du groupe ${grpName}`,
    );

    const editLogEmbed = new EmbedBuilder()
        .setTitle(`Modif nb participant d'un groupe`)
        .setDescription(
            `**${author.user.tag}** vient de modifier le nb de membres max par **${nbMax}** du groupe **${grpName}**`,
        );
    const editEmbed = new EmbedBuilder().setDescription(
        `${CHECK_MARK} Nouveau nb de participant pour le groupe **${grpName}** : ${nbMax} !`,
    );

    // - send logs
    await sendLogs(interaction.client, interaction.guildId, editLogEmbed);

    await interaction.reply({ embeds: [editEmbed] });
};

exports.editNbParticipant = editNbParticipant;
