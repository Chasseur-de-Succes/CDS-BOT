const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} = require("discord.js");
const { createError } = require("../../../util/envoiMsg");
const { YELLOW } = require("../../../data/colors.json");
const { UserRepository, GameItemShopRepository } = require("../../../repositories");
const NB_PAR_PAGES = 10;

async function list(interaction) {
    const author = interaction.member;

    const userDb = await UserRepository.findByDiscordId(author.id);
    if (!userDb) {
        return interaction.reply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    const items = await GameItemShopRepository.findGameItemShopByGame();
    let embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle("💰 BOUTIQUE - LISTE JEUX DISPONIBLES 💰")
        .setDescription("Liste des jeux disponibles à l'achat.")
        .setFooter({
            text: `💵 ${userDb.money} ${process.env.MONEY}`,
        });

    if (items.length === 0) {
        embed.setDescription(`Liste des jeux disponibles à l'achat.
                                **A U C U N**`);
        return interaction.reply({ embeds: [embed] });
    }

    const rows = [];
    // row pagination
    const prevBtn = new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("Préc.")
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const nextBtn = new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Suiv.")
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(items.length / NB_PAR_PAGES <= 1);

    const rowBuyButton = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

    rows.unshift(rowBuyButton);

    /* 1ere page liste */
    embed = createListGame(items, userDb.money);
    await interaction.reply({
        embeds: [embed],
        components: rows,
    });
    const msgListEmbed = await interaction.fetchReply();

    // Collect button interactions
    const collector = msgListEmbed.createMessageComponentCollector({
        filter: ({ user }) => user.id === author.id,
        time: 300000, // 5min
    });
    let currentIndex = 0;
    collector.on("collect", async (itr) => {
        // si bouton 'prev' ou 'next' (donc pas 'buy')
        if (itr.customId === "prev" || itr.customId === "next") {
            currentIndex += itr.customId === "prev" ? -1 : 1;

            const max = items.length;
            // disable si 1ere page
            prevBtn.setDisabled(currentIndex === 0);
            // disable next si dernière page
            nextBtn.setDisabled((currentIndex + 1) * NB_PAR_PAGES > max);

            // Respond to interaction by updating message with new embed
            await itr.update({
                embeds: [
                    await createListGame(items, userDb.money, currentIndex),
                ],
                components: [
                    new ActionRowBuilder({ components: [prevBtn, nextBtn] }),
                ],
            });
        }
    });

    // apres 5 min, on "ferme" la boutique
    collector.on("end", () => {
        msgListEmbed.edit({
            embeds: [createListGame(items, userDb.money, currentIndex)],
            components: [],
        });
    });
}

function createListGame(items, money, currentIndex = 0) {
    const embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle("💰 BOUTIQUE - LISTE JEUX DISPONIBLES 💰")
        //.setDescription(`Liste des jeux disponibles à l'achat.`)
        .setFooter({
            text: `💵 ${money} ${process.env.MONEY} | Page ${
                currentIndex + 1
            }/${Math.ceil(items.length / NB_PAR_PAGES)}`,
        });

    // on limite le nb de jeu affichable (car embed à une limite de caracteres)
    // de 0 à 10, puis de 10 à 20, etc
    // on garde l'index courant (page du shop), le nom du jeu et le prix min
    const pages = [];
    const jeux = [];
    const prixMin = [];
    for (let i = currentIndex * 10; i < 10 + currentIndex * 10; i++) {
        const item = items[i];
        if (item) {
            pages.push(`**[${i + 1}]**`);
            jeux.push(`*${item.game.name}*`);

            // recupere montant minimum
            prixMin.push(
                Math.min(...item.items.map((p) => p.price)),
            );
        }
    }

    embed.setDescription(`*Pour accéder à la page du shop du jeu concerné : \`/shop jeux <n° page>\`*
                            Jeux disponibles à l'achat :`);
    // pour les afficher et aligner : 1ere colonne : pages, 2eme : prix min 3eme : nom du jeu
    embed.addFields(
        { name: "Page", value: pages.join("\n"), inline: true },
        { name: "Prix min", value: prixMin.join("\n"), inline: true },
        { name: "Jeu", value: jeux.join("\n"), inline: true },
    );

    return embed;
}

exports.list = list;
