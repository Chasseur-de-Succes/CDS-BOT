const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../util/envoiMsg");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { YELLOW } = require("../../../data/colors.json");

async function sell(interaction, options) {
    const gameId = options.get("jeu")?.value;
    const montant = options.get("prix")?.value;
    const client = interaction.client;
    const author = interaction.member;

    const userDb = await client.getUser(author);
    if (!userDb) {
        return interaction.reply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    if (!Number.parseInt(gameId)) {
        return interaction.reply({
            embeds: [
                createError("Jeu non trouvé ou donne trop de résultats !"),
            ],
        });
    }

    if (montant < 0) {
        return interaction.reply({
            embeds: [createError("Montant négatif !")],
        });
    }

    // "Bot réfléchit.."
    await interaction.deferReply();

    // Jeu déjà recherché via autocomplete

    // On récupère le custom id "APPID_GAME"
    const game = await client.findGameByAppid(gameId);

    const item = {
        guildId: interaction.guildId,
        montant: montant,
        game: game,
        seller: userDb,
    };
    const itemDb = await client.createGameItemShop(item);

    const embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle("💰 BOUTIQUE - VENTE 💰")
        .setDescription(`${CHECK_MARK} Ordre de vente bien reçu !
        ${game.name} à ${montant} ${process.env.MONEY}`);

    // edit car deferReply
    interaction.editReply({ embeds: [embed] });

    // envoie log 'Nouvel vente par @ sur jeu X' (voir avec Tobi)
    createLogs(
        client,
        interaction.guildId,
        "Nouveau jeu dans le shop",
        `${author} vient d'ajouter **${game.name}** à **${montant} ${process.env.MONEY}** !`,
        `ID : ${itemDb._id}`,
        YELLOW,
    );
}

exports.sell = sell;
