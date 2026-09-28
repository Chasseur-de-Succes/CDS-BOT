const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../util/envoiMsg");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { YELLOW } = require("../../../data/colors.json");
const { MIN_PRICE_SHOP } = require("../../../util/constants");
const { UserRepository, GameRepository, GameItemShopRepository } = require("../../../repositories");

async function sell(interaction, options) {
    const gameAppid = options.get("jeu")?.value;
    const montant = options.get("prix")?.value;
    const client = interaction.client;
    const author = interaction.member;

    // "Bot réfléchit.."
    await interaction.deferReply();

    const userDb = await UserRepository.findByDiscordId(author.id);
    if (!userDb) {
        return interaction.editReply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    if (!Number.parseInt(gameAppid)) {
        return interaction.editReply({
            embeds: [
                createError("Jeu non trouvé ou donne trop de résultats !"),
            ],
        });
    }

    if (montant < 0) {
        return interaction.editReply({
            embeds: [createError("Montant négatif !")],
        });
    } else if (montant < MIN_PRICE_SHOP) {
        return interaction.editReply({
            embeds: [
                createError(
                    `Le montant minimum est de ${MIN_PRICE_SHOP} ${process.env.MONEY}`,
                ),
            ],
        });
    }

    // Jeu déjà recherché via autocomplete

    // On récupère le custom id "APPID_GAME"
    const game = await GameRepository.findByAppid(gameAppid);

    const item = {
        guildId: interaction.guildId,
        price: montant,
        game: gameAppid,
        seller: userDb.id,
    };
    const itemDb = await GameItemShopRepository.create(item);

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
        `ID : ${itemDb.id}`,
        YELLOW,
    );
}

exports.sell = sell;
