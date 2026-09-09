const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { CRIMSON } = require("../../../../data/colors.json");
const { ObservationRepository } = require("../../../../repositories");

async function addObservationFields(embed, observations, currentPage, pageSize, client) {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, observations.length);

    embed.setFields([]);
    for (const observation of observations.slice(startIndex, endIndex)) {
        const timestamp = Math.floor(observation.date.getTime() / 1000);
        let reporter;
        try {
            const fetched = await client.users.fetch(observation.reporterId);
            reporter = fetched.toString();
        } catch {
            reporter = `Utilisateur inconnu (\`${observation.userId}\`)`;
        }

        embed.addFields({
            name: `🔸 ID: ${observation.id}`,
            value: `${observation.reason}\nPar ${reporter}, le <t:${timestamp}:F>`,
        });
    }
}

async function history(interaction, options) {
    const user = options.get("user")?.user;
    const client = interaction.client;
    const EMBED_FIELD_LIMIT = 5; // Limite par Discord de 25 !
    let currentPage = 1;

    await interaction.deferReply();

    const userList = await ObservationRepository.findByUserId(user.id);
    const nbPages = Math.max(Math.ceil(userList.length / EMBED_FIELD_LIMIT), 1);

    let embed = new EmbedBuilder()
        .setColor(CRIMSON)
        .setTitle(`🕵️ Historique des notes d'observation de ${user.displayName}`)
        .setDescription(`${user}`)
        .setFooter({
            text: `Page ${currentPage}/${nbPages}`,
        })
        .setTimestamp();

    if (userList.length === 0) {
        embed.addFields({
            name: `😎 Aucune note d'observation.`,
            value: `\u200B`,
        });
    } else {
        await addObservationFields(
            embed,
            userList,
            currentPage,
            EMBED_FIELD_LIMIT,
            client,
        );
    }

    let row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("previous")
            .setEmoji("⏪")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("next")
            .setEmoji("⏩")
            .setStyle(ButtonStyle.Secondary),
    );

    let msg = await interaction.editReply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
    });

    const collectorFilter = (i) => i.user.id === interaction.user.id;

    // COLLECTOR sur le message créé
    const timer = 30000; // (30 seconds)
    const collector = msg.createMessageComponentCollector({
        filter: collectorFilter,
        time: timer,
    });

    collector.on("collect", async (i) => {
        if (i.customId === "previous" && currentPage > 1) {
            currentPage--;
        } else if (i.customId === "next" && currentPage < nbPages) {
            currentPage++;
        }

        if (userList.length === 0) {
            embed.setFields([
                {
                    name: `😎 Aucune note d'observation.`,
                    value: `\u200B`,
                },
            ]);
        } else {
            await addObservationFields(
                embed,
                userList,
                currentPage,
                EMBED_FIELD_LIMIT,
                client,
            );
        }

        embed.setFooter({ text: `Page ${currentPage}/${nbPages}` });

        await i.update({
            embeds: [embed],
            components: [row],
        });
    });

    collector.on("end", async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            row.components.map((btn) =>
                ButtonBuilder.from(btn).setDisabled(true),
            ),
        );

        await msg.edit({ components: [disabledRow] });
    });
}

exports.history = history;
