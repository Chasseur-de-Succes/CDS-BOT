const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { editMsgHubGroup } = require("../../../util/msg/group");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { User } = require("../../../models");

const transfert = async (interaction, options) => {
    const grpName = options.get("nom")?.value;
    const newCaptain = options.get("membre")?.member; // USER
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);

    await interaction.deferReply();

    // Test si le capitaine est inscrit
    const authorDb = await client.getUser(author);
    if (!authorDb) {
        // Si pas dans la BDD
        return interaction.editReply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }
    const newCaptainDb = await client.getUser(newCaptain);
    if (!newCaptainDb) {
        return interaction.editReply({
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
        return interaction.editReply({
            embeds: [createError(`Le groupe **${grpName}** n'existe pas !`)],
        });
    }

    // Si l'auteur n'est pas admin et n'est pas capitaine
    if (!isAdmin && !grp.captain._id.equals(authorDb._id)) {
        return interaction.editReply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe **${grpName}** !`),
            ],
        });
    }

    // si le nouveau capitaine fait parti du groupe
    const memberGrp = grp.members.find((u) => u._id.equals(newCaptainDb._id));
    if (!memberGrp) {
        return interaction.editReply({
            embeds: [
                createError(
                    `${newCaptain} ne fait pas parti du groupe **${grpName}** !`,
                ),
            ],
        });
    }

    const oldCaptainDb = await User.findOne({ _id: grp.captain._id });
    const oldCaptain = await interaction.guild.members
        .fetch(oldCaptainDb.userId)
        .catch(() => null);

    // update du groupe : captain
    await client.update(grp, {
        captain: newCaptainDb,
        dateUpdated: Date.now(),
    });

    // update perm
    const channel = await interaction.guild.channels
        .fetch(grp.channelId)
        .catch(() => null);
    if (channel) {
        await channel.permissionOverwrites.edit(newCaptain, {
            [PermissionFlagsBits.PinMessages]: true,
        });
        if (oldCaptain) {
            await channel.permissionOverwrites.edit(oldCaptain, {
                [PermissionFlagsBits.PinMessages]: false,
            });
        }

        channel.send(`👑 ${newCaptain} est le nouveau capitaine du groupe`);
    } else {
        logger.warn(`Le channel du groupe "${grpName}" est introuvable`);
    }

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);
    logger.info(
        `${author.user.tag} vient de nommer ${newCaptain.user.tag} capitaine du groupe ${grpName}`,
    );
    const newMsgEmbed = new EmbedBuilder().setDescription(
        `${CHECK_MARK} ${newCaptain} est le nouveau capitaine du groupe **${grpName}** !`,
    );
    await interaction.editReply({ embeds: [newMsgEmbed] });
};

exports.transfert = transfert;
