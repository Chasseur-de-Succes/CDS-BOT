const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { deleteRappelJob, editMsgHubGroup } = require("../../../util/msg/group");
const { createRappelJob } = require("../../../util/batch/batch");
const { CHECK_MARK } = require("../../../data/emojis.json");
const moment = require("moment-timezone");
const { discordTimestamp } = require("../../../util/discordFormatters");
const { UserRepository, GroupRepository } = require("../../../repositories");

const schedule = async (interaction, options) => {
    const idGrp = options.get("nom")?.value;
    const dateVoulue = options.get("jour")?.value; // INTEGER
    const heureVoulue = options.get("heure")?.value;
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

    // Récupération du groupe
    const grp = await GroupRepository.findByIdWithRelations(idGrp);
    if (!grp) {
        return interaction.editReply({
            embeds: [createError(`Le groupe n'existe pas !`)],
        });
    }

    // Si l'auteur n'est pas capitaine ou admin
    if (!isAdmin && !grp.captain._id.equals(authorDb._id)) {
        return interaction.editReply({
            embeds: [
                createError(`Tu n'es pas capitaine du groupe ${grp.name} !`),
            ],
        });
    }

    // Test si date bon format
    const allowedDateFormat = ["DD/MM/YY HH:mm", "DD/MM/YYYY HH:mm"];
    if (
        !moment(
            `${dateVoulue} ${heureVoulue}`,
            allowedDateFormat,
            true,
        ).isValid()
    ) {
        return interaction.editReply({
            embeds: [
                createError(
                    `${dateVoulue} ${heureVoulue} n'est pas une date valide.\nFormat accepté : ***jj/mm/aa HH:MM***`,
                ),
            ],
        });
    }

    // Parse string to Moment (date)
    const dateEvent = moment.tz(
        `${dateVoulue} ${heureVoulue}`,
        allowedDateFormat,
        "Europe/Paris",
    );
    const dateTimestamp = {
        full: discordTimestamp(dateEvent, "F"),
        short: discordTimestamp(dateEvent, "f"),
    };

    if (dateEvent < grp.dateCreated) {
        return interaction.editReply({
            embeds: [
                createError(
                    `La date du ${dateTimestamp.short} est avant la création du groupe.`,
                ),
            ],
        });
    }

    if (!grp.dates) {
        grp.dates = [];
    }

    // Si la date existe déjà, la supprimer
    const indexDateEvent = grp.dates.findIndex(
        (d) => d.getTime() === dateEvent.valueOf(),
    );
    let titreReponse = `${CHECK_MARK} `;
    let msgReponse = "▶️ ";
    if (indexDateEvent >= 0) {
        grp.dates.splice(indexDateEvent, 1);

        titreReponse += "Rdv enlevé 🚮";
        msgReponse += `Session enlevée, le ${dateTimestamp.short} !`;
        logger.info(`.. date ${dateEvent} retiré`);
    } else {
        // Sinon, on l'ajoute, dans le bon ordre
        grp.dates.push(dateEvent);

        titreReponse += "Rdv ajouté 🗓";
        msgReponse += `Session ajoutée, le ${dateTimestamp.short} !`;

        // avertissement si la date a déjà eu lieu ou si > 3 mois
        const today = Date.now();
        const inThreeMonts = new Date();
        inThreeMonts.setMonth(inThreeMonts.getMonth() + 3);
        if (dateEvent < today) {
            msgReponse += `\n⚠️ Cette session a déjà eu lieu.`;
        } else if (dateEvent > inThreeMonts) {
            msgReponse += `\n⚠️ Cette session est dans plus de 3 mois.`;
        }

        logger.info(`.. date ${dateEvent} ajouté`);
    }

    grp.dateUpdated = new Date();
    await GroupRepository.update(grp.id, { dates: grp.dates, dateUpdated: grp.dateUpdated });

    // créer/update rappel
    if (indexDateEvent >= 0) {
        deleteRappelJob(client, grp, dateEvent.toDate());
    } else {
        await createRappelJob(
            client,
            interaction.guildId,
            grp,
            dateEvent.toDate(),
        );
    }

    // update msg
    await editMsgHubGroup(client, interaction.guildId, grp);

    // Envoi d'une notification dans un salon
    if (grp.channelId) {
        const guild = await client.guilds.cache.get(interaction.guildId);
        if (guild) {
            const channel = await guild.channels.cache.get(grp.channelId);

            if (channel) {
                if (indexDateEvent >= 0) {
                    channel.send(
                        `> ⚠️ La session du ${dateTimestamp.full} a été **supprimée**.`,
                    );
                } else {
                    channel.send(
                        `> 🗓 Nouvelle session le ${dateTimestamp.full} !`,
                    );
                }
            }
        }
    }

    const newMsgEmbed = new EmbedBuilder()
        .setTitle(titreReponse)
        .setDescription(msgReponse);
    return interaction.editReply({ embeds: [newMsgEmbed] });
};

exports.schedule = schedule;
