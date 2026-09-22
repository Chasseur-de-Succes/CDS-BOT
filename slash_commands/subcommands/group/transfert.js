const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { editMsgHubGroup } = require("../../../util/msg/group");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { User } = require("../../../models");
const { UserRepository, GroupRepository } = require("../../../repositories");

const transfert = async (interaction, options) => {
    const idGrp = options.get("nom")?.value;
    const newCaptain = options.get("membre")?.member; // USER
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);

    await interaction.deferReply();

    // Test si le capitaine est inscrit
    const authorDb = await UserRepository.findByDiscordId(author.id);
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
    const newCaptainDb = await UserRepository.findByDiscordUser(newCaptain);
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
    const grp = await GroupRepository.findByIdWithRelations(idGrp);
    if (!grp) {
        return interaction.editReply({
            embeds: [createError(`Le groupe **${grp.name}** n'existe pas !`)],
        });
    }

    // Si l'auteur n'est pas admin et n'est pas capitaine
    if (!(isAdmin || grp.captainUser.id === authorDb.id)) {
        return interaction.editReply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe **${grp.name}** !`),
            ],
        });
    }

    // si le nouveau capitaine fait parti du groupe
    const memberGrp = grp.members.find((u) => u.id === newCaptainDb.id);
    if (!memberGrp) {
        return interaction.editReply({
            embeds: [
                createError(
                    `${newCaptain} ne fait pas parti du groupe **${grp.name}** !`,
                ),
            ],
        });
    }

    const oldCaptain = await interaction.guild.members
        .fetch(grp.captainUser.discordId)
        .catch(() => null);

    if (newCaptain === oldCaptain) {
        return interaction.editReply({
            embeds: [
                createError(
                    isAdmin
                        ? `${newCaptain} a déjà pris la tête de l’escouade 🎮`
                        : `Tu es déjà capitaine du groupe 😄`,
                ),
            ],
        });
    }

    // update du groupe : captain
    await GroupRepository.update(grp.id, {
        captain: newCaptainDb.id,
        dateUpdated: new Date(),
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
        logger.warn(`Le channel du groupe "${grp.name}" est introuvable`);
    }

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);
    logger.info(
        `${author.user.tag} vient de nommer ${newCaptain.user.tag} capitaine du groupe ${grp.name}`,
    );
    const newMsgEmbed = new EmbedBuilder().setDescription(
        `${CHECK_MARK} ${newCaptain} est le nouveau capitaine du groupe **${grp.name}** !`,
    );
    await interaction.editReply({ embeds: [newMsgEmbed] });
};

exports.transfert = transfert;
