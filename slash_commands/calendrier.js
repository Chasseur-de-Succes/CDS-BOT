const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    time,
} = require("discord.js");
const { createError } = require("../util/envoiMsg");
const { Group } = require("../models");
const { TimestampStyles } = require("@discordjs/formatters");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("calendrier")
        .setDescription("Affiche le calendrier des prochains événements")
        .setDMPermission(true)
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Cet utilisateur en particulier"),
        ),
    async execute(interaction) {
        const client = interaction.client;
        const guildId = interaction.guildId;
        // si aucun argument pour target, on prend l'utilisateur qui a envoyé la commande
        const user = interaction.options.getUser("target") ?? interaction.user;

        const dbUser = await client.findUserById(user.id);

        if (!dbUser) {
            // Si pas dans la BDD
            const embedErr = createError(
                `${user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
            );
            return interaction.reply({ embeds: [embedErr] });
        }

        // message en attente
        await interaction.deferReply();

        // récupération du jour courant (sert d'index)
        let today = new Date();
        const embed = await createEmbed(
            new Date(),
            guildId,
            dbUser,
            user.username,
        );

        // boutons prev, auj, next
        const precedent = new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("⇐")
            .setStyle(ButtonStyle.Danger);
        const auj = new ButtonBuilder()
            .setCustomId("today")
            .setLabel(`Aujourd'hui`)
            .setStyle(ButtonStyle.Secondary);
        const suivant = new ButtonBuilder()
            .setCustomId("next")
            .setLabel("⇒")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(
            precedent,
            auj,
            suivant,
        );

        // envoi de l'embed
        const message = await interaction.editReply({
            embeds: [embed],
            components: [row],
        });

        // Collect button interactions
        const collector = message.createMessageComponentCollector({
            filter: ({ user }) => user.id === interaction.user.id,
            time: 300000, // 5min
        });

        collector.on("collect", async (itr) => {
            if (itr.customId === "prev") {
                today.setDate(today.getDate() - 7);
            } else if (itr.customId === "today") {
                today = new Date();
            } else if (itr.customId === "next") {
                today.setDate(today.getDate() + 7);
            }

            // Respond to interaction by updating message with new embed
            await itr.update({
                embeds: [
                    await createEmbed(
                        new Date(today),
                        guildId,
                        dbUser,
                        user.username,
                    ),
                ],
                components: [row],
            });
        });

        // apres 5 min, on "ferme"
        collector.on("end", async () => {
            await interaction.editReply({
                embeds: [
                    await createEmbed(
                        new Date(today),
                        guildId,
                        dbUser,
                        user.username,
                    ),
                ],
                components: [],
            });
        });
    },
};

// créer un embed, du lundi au dimanche de la date donnée
// contenant pour chaque jour les événements de l'utilisateur donné
async function createEmbed(date, guildId, dbUser, username) {
    // récupère le lundi / dimanche de la semaine du jour donnée
    const crtLundi = new Date(date.setDate(date.getDate() - date.getDay() + 1));
    const crtDimanche = new Date(
        date.setDate(date.getDate() - date.getDay() + 7),
    );
    const jours = await findEventBetween(
        crtLundi,
        crtDimanche,
        guildId,
        dbUser,
    );

    // création de l'embed sur la semaine courante
    const weekStart = crtLundi.toLocaleDateString([], {
        day: "numeric",
        month: "short",
    });
    const weekEnd = crtDimanche.toLocaleDateString([], {
        day: "numeric",
        month: "short",
    });

    const titre = `🗓️ ${weekStart} ➡️ ${weekEnd}`;

    const footer = `planning de ${username}`;

    return new EmbedBuilder()
        .setColor("Red")
        .setTitle(titre)
        .setFooter({ text: footer })
        .addFields(jours);
}

// cherche les événements d'un utilisateur donnée, sur une période donnée
// retourne un tableau de field ({name: "..", value: "..}) pour être inséré directement dans l'embed
async function findEventBetween(lundi, dimanche, guildId, dbUser) {
    const options = {
        month: "short",
        day: "numeric",
    };
    logger.info(
        `.. recherche event du ${lundi.toLocaleDateString(
            "fr-FR",
            options,
        )} au ${dimanche.toLocaleDateString("fr-FR", options)}`,
    );

    // parcours de la semaine
    const jours = [];
    for (let i = 0; i < 7; i++) {
        // nouvelle instance de Date à partir du lundi
        const date = new Date(lundi);
        // +i jour
        date.setDate(date.getDate() + i);

        // recup groupes qui ont la date courante
        const groups = await Group
            // .where('guildId', guildId)
            .where("dateEvent")
            .gte(new Date(date.setHours(0, 0)))
            .lte(new Date(date.setHours(23, 59)))
            .where("members")
            .in(dbUser)
            .populate("game")
            .exec();

        let fieldValue = "◾◾◾";
        for (const group of groups) {
            const {
                channelId,
                dateEvent,
                game: { name: game },
            } = group;

            const found = dateEvent.filter(
                (d) =>
                    date.getDate() === d.getDate() &&
                    date.getDay() === d.getDay(),
            );
            if (found.length) {
                const infos = [];

                for (const foundElement of found) {
                    infos.push(
                        `**| ${time(
                            foundElement,
                            TimestampStyles.ShortTime,
                        )} |**`,
                    );
                    infos.push(`*${game}*`);
                    infos.push(`<#${channelId}>`);
                }

                fieldValue = infos.join("\n");
            }
        }

        jours[i] = {
            name: date.toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "2-digit",
            }),
            value: fieldValue,
            inline: i !== 6, // si dernier (dimanche) pas de inline
        };
    }

    return jours;
}
