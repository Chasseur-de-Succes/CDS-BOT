const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require("discord.js");
const { createError, createLogs } = require("../../../util/envoiMsg");
const { CHECK_MARK, NO_SUCCES } = require("../../../data/emojis.json");
const { YELLOW } = require("../../../data/colors.json");
const moment = require("moment");
const { UserRepository, GameItemShopRepository } = require("../../../repositories");

async function jeux(interaction, options, showGame = false) {
    const nbPage = options.get("page") ? options.get("page").value - 1 : 0;
    const client = interaction.client;
    const guild = interaction.guild;
    const author = interaction.member;

    // "Bot réfléchit.."
    await interaction.deferReply();

    const userDb = await UserRepository.findByDiscordUser(author);
    if (!userDb) {
        return interaction.editReply({
            embeds: [
                createError(
                    `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`/register\``,
                ),
            ],
        });
    }

    const infos = {};
    infos.money = userDb.money;

    if (showGame) {
        // Si JEUX
        infos.soustitre = "JEUX";
        infos.type = 0;
        // recupere array d'info sur jeux à vendre
        // [0]._id -> Game
        // [0].items -> GameItemShop
        infos.items = await GameItemShopRepository.findGameItemShopByGame();
    } else {
        // Si CUSTOM
        infos.soustitre = "TUNNING";
        infos.type = 1;
    }

    const max = infos.items?.length ?? 0;
    // si 0 item dispo
    if (showGame && max === 0) {
        return interaction.editReply({
            embeds: [
                createError(`Désolé, aucun item n'est actuellement en vente !`),
            ],
        });
    }

    // teste si index nbPages existe
    if (nbPage < 0 || nbPage >= max) {
        return interaction.editReply({
            embeds: [
                createError(`Oh là, il n'y a pas autant de pages que ça !`),
            ],
        });
    }
    let currentIndex = nbPage;

    // row pagination
    const prevBtn = new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("Préc.")
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(nbPage === 0);
    const nextBtn = new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Suiv.")
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(nbPage + 1 === max);
    const buyBtn = new ButtonBuilder()
        .setCustomId("buy")
        .setLabel("Acheter")
        .setEmoji("💸")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(
            infos.type === 1 ||
            userDb.money < infos.items[currentIndex].items[0].price,
        );
    const rowBuyButton = new ActionRowBuilder().addComponents(
        prevBtn,
        nextBtn,
        buyBtn,
    );

    // on envoie créer et envoie le message du shop
    const shopEmbed = createShop(guild, infos, nbPage);
    await interaction.editReply({
        embeds: [shopEmbed],
        components: [rowBuyButton],
    });
    const msgShopEmbed = await interaction.fetchReply();

    // Collect button interactions
    const collector = msgShopEmbed.createMessageComponentCollector({
        filter: ({ user }) => user.id === author.id,
        time: 300000, // 5min
    });

    collector.on("collect", async (itr) => {
        // si bouton 'prev' ou 'next' (donc pas 'buy')
        if (itr.customId !== "buy") {
            currentIndex += itr.customId === "prev" ? -1 : 1;
            // disable si 1ere page
            prevBtn.setDisabled(currentIndex === 0);
            // disable next si derniere page
            nextBtn.setDisabled(currentIndex + 1 === max);
            // disable buy si pas assez argent
            buyBtn.setDisabled(
                userDb.money < infos.items[currentIndex].items[0].price,
            );

            // Respond to interaction by updating message with new embed
            await itr.update({
                embeds: [createShop(guild, infos, currentIndex)],
                components: [
                    new ActionRowBuilder({
                        components: [prevBtn, nextBtn, buyBtn],
                    }),
                ],
            });
        } else if (infos.type === 0) {
            const items = infos.items[currentIndex];
            const vendeur = guild.members.cache.get(
                items.items[0].sellerInfo.discordId,
            );

            // empeche l'achat de son propre jeu
            if (items.items[0].sellerInfo.discordId === userDb.discordId) {
                return itr.reply({
                    embeds: [
                        createError("Tu ne peux pas acheter ton propre jeu !"),
                    ],
                    ephemeral: true,
                });
            }

            // empeche l'achat si - de 2j
            const nbDiffDays = Math.abs(
                moment(userDb.lastBuy).diff(moment(), "days"),
            );
            if (userDb.lastBuy && nbDiffDays <= 2) {
                collector.stop();
                return itr.reply({
                    embeds: [
                        createError(
                            "Tu dois attendre au mois 2 jours avant de pouvoir racheter un jeu !",
                        ),
                    ],
                    ephemeral: true,
                });
            }

            // ACHETE !
            buyGame(
                client,
                interaction.guildId,
                author,
                userDb,
                vendeur,
                items,
            );

            // message recap
            const recapEmbed = new EmbedBuilder()
                .setColor(YELLOW)
                .setTitle(`💰 BOUTIQUE - ${infos.soustitre} - RECAP' 💰`)
                .setDescription(`${CHECK_MARK} ${author}, vous venez d'acheter **${items.game.name}** à **${items.items[0].price}** ${process.env.MONEY}
                        ${vendeur} a reçu un **DM**, dès qu'il m'envoie la clé, je te l'envoie !

                        *En cas de problème, n'hésitez pas à contacter un **admin***.`)
                .setFooter({
                    text: `💵 ${userDb.money - items.items[0].price} ${
                        process.env.MONEY
                    }`,
                });

            // maj du msg, en enlevant boutons actions
            await itr.update({
                embeds: [recapEmbed],
                components: [],
            });
        } else if (infos.type === 1) {
            // achat custom
        }
    });

    // apres 5 min, on "ferme" la boutique
    collector.on("end", () => {
        msgShopEmbed.edit({
            embeds: [createShop(guild, infos, currentIndex)],
            components: [],
        });
    });
}

function createShop(guild, infos, currentIndex = 0) {
    const embed = new EmbedBuilder()
        .setColor(YELLOW)
        .setTitle(`💰 BOUTIQUE - ${infos.soustitre} 💰`);
    // JEUX
    if (infos.type === 0) {
        const game = infos.items[currentIndex].game;
        const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
        const items = infos.items[currentIndex].items;

        const steamLink = `[Steam](https://steamcommunity.com/app/${game.appid})`;
        const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${game.appid})`;
        const succesIcon = game.hasAchievements ? "🏆" : NO_SUCCES;
        const links = `${succesIcon} | ${steamLink} | ${astatLink} `;

        embed
            .setThumbnail(gameUrlHeader)
            .setDescription(`**${game.name}**
                            ${links}`)
            .setFooter({
                text: `💵 ${infos.money} ${process.env.MONEY} | Page ${
                    currentIndex + 1
                }/${infos.items.length}`,
            });

        let nbItem = 0;
        const nbMax = 5;
        const prix = [];
        const vendeurStr = [];
        for (const item of items) {
            const vendeur = guild.members.cache.get(item.sellerInfo.discordId);
            // on limite le nb de jeu affichable (car embed à une limite de caracteres)
            if (nbItem < nbMax) {
                prix.push(`${item.price} ${process.env.MONEY}`);
                vendeurStr.push(vendeur);
                nbItem++;
            }
        }

        embed.addFields(
            { name: "Prix", value: prix.join("\n"), inline: true },
            { name: "Vendeur", value: vendeurStr.join("\n"), inline: true },
            { name: "\u200B", value: "\u200B", inline: true }, // 'vide' pour remplir le 3eme field et passé à la ligne
        );

        // si nbmax atteint, on affiche le nb de jeux restants
        if (nbItem > nbMax) {
            embed.addFields({
                name: "Nb copies restantes",
                value: `${items.length - nbItem}`,
            });
        }
    } else if (infos.type === 1) {
        // TUNNNG
        embed.setDescription("***🚧 En construction 🚧***");
    }
    return embed;
}

async function buyGame(client, guildId, author, acheteurDb, vendeur, info) {
    const game = info.game;
    const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`;
    logger.info(
        `Achat jeu ${game.name} par ${acheteurDb.username} pour ${acheteurDb.money} ${process.env.MONEY}`,
    );

    // recup dans la BD pour pouvoir le maj
    let item = await GameItemShopRepository.findByIdWithRelations(info.items[0].id); // le 1er est le - cher

    // STEP 1 : retire le montant du jeu au "porte-monnaie" de l'acheteur + date dernier achat
    await UserRepository.update(acheteurDb.id, {
        money: acheteurDb.money - item.price,
        lastBuy: new Date(),
    });
    // log 'Acheteur perd montant process.env.MONEY a cause vente'
    createLogs(
        client,
        guildId,
        "Argent perdu",
        `${author} achète **${game.name}** à **${item.price} ${process.env.MONEY}**`,
        `ID vente : ${item.id}`,
        YELLOW,
    );

    // maj buyer & etat GameItem à 'pending' ou qqchose dans le genre
    await GameItemShopRepository.update(item.id, {
        buyer: acheteurDb.id,
        state: "pending",
    });

    // STEP 2 : envoie DM au vendeur
    logger.info(`Envoi DM au vendeur ${vendeur.user.username}`);
    const mPembed = new EmbedBuilder()
        .setThumbnail(gameUrlHeader)
        .setColor(YELLOW)
        .setTitle("💰 BOUTIQUE - VENTE 💰")
        .setDescription(`${author} vous a acheté ***${game.name}*** !

            Pour recevoir vos ${item.price} ${process.env.MONEY}, il faut :
            ▶️ **Lancer la commande ** \`/envoi-cle TA-CLE-STEAM\`
            *L'acheteur recevra directement la clé dans ses MPs !*
            
            *En cas de problème, contactez un admin !*`);

    // envoi vendeur, il doit maintenant utilisé /envoi-cle
    await vendeur.user.send({
        embeds: [mPembed],
    });
}

exports.jeux = jeux;
