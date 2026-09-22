const { createError, sendLogs } = require("../../../util/envoiMsg");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { Group } = require("../../../models");
const { editMsgHubGroup } = require("../../../util/msg/group");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { UserRepository, GroupRepository } = require("../../../repositories");

const editNbParticipant = async (interaction, options) => {
    const idGrp = options.get("nom")?.value;
    const nbMax = options.get("max")?.value;
    const client = interaction.client;
    const author = interaction.member;

    // Test si le capitaine est inscrit
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

    // Si l'auteur n'est pas capitaine ou non admin
    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);
    if (!(isAdmin || grp.captainUser.id === authorDb.id)) {
        return interaction.reply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe **${grp.name}** !`),
            ],
        });
    }

    if (nbMax > 0) {
        await GroupRepository.update(grp.id, { nbMax: nbMax });
    } else {
        await GroupRepository.update(grp.id, { nbMax: null });
    }

    // Update message
    await editMsgHubGroup(client, interaction.guildId, grp);
    logger.info(
        `${author.user.tag} vient de modifier le nb de membres max par ${nbMax} du groupe ${grp.name}`,
    );

    const editLogEmbed = new EmbedBuilder()
        .setTitle(`Modif nb participant d'un groupe`)
        .setDescription(
            `**${author.user.tag}** vient de modifier le nb de membres max par **${nbMax}** du groupe **${grp.name}**`,
        );
    const editEmbed = new EmbedBuilder().setDescription(
        `${CHECK_MARK} Nouveau nb de participant pour le groupe **${grp.name}** : ${nbMax} !`,
    );

    // - send logs
    await sendLogs(interaction.client, interaction.guildId, editLogEmbed);

    await interaction.reply({ embeds: [editEmbed] });
};

exports.editNbParticipant = editNbParticipant;
