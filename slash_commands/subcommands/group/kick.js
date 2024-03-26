const { createError, sendLogs } = require("../../../util/envoiMsg");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { leaveGroup, editMsgHubGroup } = require("../../../util/msg/group");
const { CHECK_MARK } = require("../../../data/emojis.json");

const kick = async (interaction, options) => {
    const grpName = options.get("nom")?.value;
    const toKicked = options.get("membre")?.member; // USER
    const client = interaction.client;
    const author = interaction.member;

    // test si captain est register
    const authorDB = await client.getUser(author);
    if (!authorDB)
        // Si pas dans la BDD
        return interaction.reply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    const toKickedDB = await client.getUser(toKicked);
    if (!toKickedDB)
        return interaction.reply({
            embeds: [
                createError(
                    `${toKicked} n'a pas de compte ! Merci de t'enregistrer avec la commande : \`/register\``,
                ),
            ],
        });

    // Récupération du groupe
    const grp = await client.findGroupByName(grpName);
    if (!grp)
        return interaction.reply({
            embeds: [createError(`Le groupe **${grpName}** n'existe pas !`)],
        });

    // si user a kick est capitaine
    if (grp.captain._id.equals(toKickedDB._id))
        return interaction.reply({
            embeds: [
                createError(
                    `Tu ne peux pas kick le capitaine du groupe **${grpName}** !`,
                ),
            ],
        });

    // Si l'auteur n'est pas capitaine ou non admin
    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin && !grp.captain._id.equals(authorDB._id))
        return interaction.reply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe **${grpName}** !`),
            ],
        });

    // Si l'utilisateur à kick fait partie du groupe
    const memberGrp = grp.members.find((u) => u._id.equals(toKickedDB._id));
    if (!memberGrp)
        return interaction.reply({
            embeds: [
                createError(
                    `${toKicked} ne fait pas parti du groupe **${grpName}** !`,
                ),
            ],
        });

    // update du groupe : size -1 et maj members
    await leaveGroup(interaction.client, interaction.guildId, grp, toKickedDB);

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);
    logger.info(
        `${author.user.tag} vient de kick ${toKicked.user.tag} du groupe ${grpName}`,
    );

    const kickLogEmbed = new EmbedBuilder()
        .setTitle("Kick d'un groupe")
        .setDescription(
            `**${author.user.tag}** vient de kick **${toKicked.user.tag}** du groupe **${grpName}**`,
        );
    const kickEmbed = new EmbedBuilder().setDescription(
        `${CHECK_MARK} ${toKicked} a été kick du groupe **${grpName}** !`,
    );

    // - send logs
    await sendLogs(interaction.client, interaction.guildId, kickLogEmbed);

    await interaction.reply({ embeds: [kickEmbed] });
};

exports.kick = kick;
