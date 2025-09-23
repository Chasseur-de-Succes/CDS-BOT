const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { editMsgHubGroup } = require("../../../util/msg/group");
const { CHECK_MARK } = require("../../../data/emojis.json");

const transfert = async (interaction, options) => {
    const grpName = options.get("nom")?.value;
    const newCaptain = options.get("membre")?.member; // USER
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);

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
    const newCaptainDb = await client.getUser(newCaptain);
    if (!newCaptainDb) {
        return interaction.reply({
            embeds: [
                createError(
                    `${newCaptain} n'a pas de compte ! Merci de t'enregistrer avec la commande : \`/register\``,
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

    // Si l'auteur n'est pas admin et n'est pas capitaine
    if (!isAdmin && !grp.captain._id.equals(authorDb._id)) {
        return interaction.reply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe **${grpName}** !`),
            ],
        });
    }

    // si le nouveau capitaine fait parti du groupe
    const memberGrp = grp.members.find((u) => u._id.equals(newCaptainDb._id));
    if (!memberGrp) {
        return interaction.reply({
            embeds: [
                createError(
                    `${newCaptain} ne fait pas parti du groupe **${grpName}** !`,
                ),
            ],
        });
    }

    // update du groupe : captain
    await client.update(grp, {
        captain: newCaptainDb,
        dateUpdated: Date.now(),
    });

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);
    logger.info(
        `${author.user.tag} vient de nommer ${newCaptain.user.tag} capitaine du groupe ${grpName}`,
    );
    const newMsgEmbed = new EmbedBuilder().setDescription(
        `${CHECK_MARK} ${newCaptain} est le nouveau capitaine du groupe **${grpName}** !`,
    );
    await interaction.reply({ embeds: [newMsgEmbed] });
};

exports.transfert = transfert;
