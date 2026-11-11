const { PermissionFlagsBits } = require("discord.js");
const { createError, createLogs } = require("../../../util/envoiMsg");
const { dissolveGroup } = require("../../../util/msg/group");
const { WARNING } = require("../../../data/emojis.json");
const { UserRepository, GroupRepository } = require("../../../repositories");

const dissolve = async (interaction, options) => {
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

    // recup le groupe
    const grp = await GroupRepository.findByIdWithRelations(idGrp);
    if (!grp) {
        return interaction.reply({
            embeds: [createError(`Le groupe n'existe pas !`)],
        });
    }

    // si l'author n'est pas capitaine et non admin
    if (!(isAdmin || grp.captainUser.id === authorDb.id)) {
        return interaction.reply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe ${grp.name} !`),
            ],
        });
    }

    await dissolveGroup(client, interaction.guildId, grp);

    // suppression channel discussion
    if (grp.channelId) {
        interaction.guild.channels.cache
            .get(grp.channelId)
            ?.delete("Groupe supprimé");
    }

    let mentionsUsers = "";
    for (const member of grp.members) {
        mentionsUsers += `<@${member.discordId}> `;
    }

    // envoi dans channel log
    await createLogs(
        client,
        interaction.guildId,
        `${WARNING} Dissolution d'un groupe`,
        `Le groupe **${grp.name}** a été dissout.
                                                            Membres concernés : ${mentionsUsers}`,
    );

    logger.info(`${author.user.tag} a dissout le groupe ${grp.name}`);
    await interaction.reply(
        `${mentionsUsers} : le groupe **${grp.name}** a été dissout !`,
    );
};

exports.dissolve = dissolve;
