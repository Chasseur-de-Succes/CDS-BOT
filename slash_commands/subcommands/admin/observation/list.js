const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { createError } = require("../../../../util/envoiMsg");
const { CRIMSON } = require("../../../../data/colors.json");
const { ObservationRepository } = require("../../../../repositories");

async function generateDesc(observations, client) {
    let desc = `**Nombre total d'utilisateurs : ${observations.length}**\n`;
    for (let obs in observations) {
        let user;
        try {
            const fetched = await client.users.fetch(obs.userId);
            user = fetched.toString();
        } catch {
            user = `Utilisateur inconnu (\`${obs.userId}\`)`;
        }

        desc += `\n${user} - ${obs.total} notes`;
    }
    return desc;
}

async function list(interaction, options) {
    let currentPage = options.get("page")?.value || 1;
    const client = interaction.client;
    const pageSize = 15;

    await interaction.deferReply();

    const observations = await ObservationRepository.findAllGroupedByUser();
    console.log(`[DEBUG] observations: ${JSON.stringify(observations)}`);
    const nbPages = Math.ceil(observations.length / pageSize);

    if (observations.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(CRIMSON)
            .setTitle(
                "📜 Liste des utilisateurs ayant une/des note(s) d'observation",
            )
            .setDescription(`😎 La liste est vide`);
        return interaction.editReply({ embeds: [embed] });
    }

    if (currentPage > nbPages)
        return interaction.editReply({
            embeds: [
                createError(
                    `Numéro de page invalide. Il n'y a que ${nbPages} page(s).`,
                ),
            ],
        });

    let startIndex = (currentPage - 1) * pageSize;
    let endIndex = Math.min(startIndex + pageSize, observations.length);
    let desc = await generateDesc(observations, client);

    let embed = new EmbedBuilder()
        .setColor(CRIMSON)
        .setTitle(
            `📜 Liste des utilisateurs ayant une/des note(s) d'observation`,
        )
        .setFooter({ text: `Page ${currentPage}/${nbPages}` })
        .setDescription(desc);

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

        startIndex = (currentPage - 1) * pageSize;
        endIndex = Math.min(startIndex + pageSize, observations.length);
        desc = generateDesc(observations.slice(startIndex, endIndex), client);

        embed.setDescription(desc);
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

exports.list = list;
