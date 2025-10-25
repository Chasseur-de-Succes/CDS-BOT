const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { CRIMSON } = require("../../../../data/colors.json");

async function history(interaction, options) {
    const userId = options.get("user")?.value;
    const client = interaction.client;
    const EMBED_FIELD_LIMIT = 5; // Limite par Discord de 25 !
    let currentPage = 1;

    await interaction.deferReply();

    const user = await client.users.fetch(userId);
    const userList = await client.getUserObservations(userId);
    const nbPages = Math.ceil(userList.length / EMBED_FIELD_LIMIT);

    let embed = new EmbedBuilder()
        .setColor(CRIMSON)
        .setTitle(`🕵️ Historique des notes d'observation de ${user.displayName}`)
        .setDescription(`${user}`)
        .setFooter({
            text: `Page ${currentPage}/${nbPages == 0 ? 1 : nbPages}`,
        })
        .setTimestamp();

    if (userList.length === 0) {
        embed.addFields({
            name: `😎 Aucune note d'observation.`,
            value: `\u200B`,
        });
    } else {
        let startIndex = (currentPage - 1) * EMBED_FIELD_LIMIT;
        let endIndex = Math.min(
            startIndex + EMBED_FIELD_LIMIT,
            userList.length,
        );
        for (let i = startIndex; i < endIndex; i++) {
            const timestamp = Math.floor(userList[i].date.getTime() / 1000);
            let reporter;
            try {
                const fetched = await client.users.fetch(
                    userList[i].reporterId,
                );
                reporter = fetched.toString();
            } catch {
                reporter = `Utilisateur inconnu (\`${userList[i].userId}\`)`;
            }

            embed.addFields({
                name: `🔸 ID: ${userList[i]._id}`,
                value: `${userList[i].reason}\nPar ${reporter}, le <t:${timestamp}:F>`,
            });
        }
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

        startIndex = (currentPage - 1) * EMBED_FIELD_LIMIT;
        endIndex = Math.min(startIndex + EMBED_FIELD_LIMIT, userList.length);
        //embed = new EmbedBuilder(embed.data);
        embed.setFields([]); // reset Fields
        for (let i = startIndex; i < endIndex; i++) {
            const timestamp = Math.floor(userList[i].date.getTime() / 1000);
            let reporter;
            try {
                const fetched = await client.users.fetch(
                    userList[i].reporterId,
                );
                reporter = fetched.toString();
            } catch {
                reporter = `Utilisateur inconnu (\`${userList[i].userId}\`)`;
            }

            embed.addFields({
                name: `🔸 ID: ${userList[i]._id}`,
                value: `${userList[i].reason}\nPar ${reporter}, le <t:${timestamp}:F>`,
            });
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
