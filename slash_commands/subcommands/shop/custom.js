const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { createError, createLogs } = require("../../../util/envoiMsg");
const { getJsonValue } = require("../../../util/util");
const { User } = require("../../../models");
const { NIGHT, GREEN, DARK_RED } = require("../../../data/colors.json");
const customItems = require("../../../data/customShop.json");

async function custom(interaction, options) {
    const type = options.get("type").value;
    const client = interaction.client;
    const author = interaction.member;

    // "Bot réfléchit.."
    await interaction.deferReply();

    const userDb = await client.getUser(author);
    if (!userDb) {
        return interaction.editReply({
            embeds: [
                createError(
                    `Tu n'as pas de compte ! Merci de t'enregistrer avec la commande : \`/register\``,
                ),
            ],
        });
    }

    // type : ["text", "border", ...]
    logger.info(`.. Item '${type}' choisi`);

    // edit embed: choix parmis élément dans customItems[type].value

    createChoixCustom(interaction, userDb, type, customItems);
}

async function createChoixCustom(interaction, userDb, type, customItems) {
    const itemsSelect = [];
    for (const x in customItems[type].values) {
        const nom = customItems[type].values[x].name;
        const prix = customItems[type].values[x].price;

        itemsSelect.push({
            label: `💰 ${prix} : ${nom}`,
            value: x,
        });
    }
    const rowItem = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`custom-item-${type}`)
            .setPlaceholder(`Choisir l'élément à acheter..`)
            .addOptions(itemsSelect),
    );

    const embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle("💰 BOUTIQUE - PROFILE 💰")
        .setDescription("Quel élément voulez-vous acheter ?")
        .setFooter({ text: `💵 ${userDb.money} ${process.env.MONEY}` });

    const msgEmbed = await interaction.editReply({
        embeds: [embed],
        components: [rowItem],
    });

    // attend une interaction bouton de l'auteur de la commande
    let filter;
    let itrSelect;
    try {
        filter = (i) => {
            i.deferUpdate();
            return i.user.id === interaction.user.id;
        };
        itrSelect = await msgEmbed.awaitMessageComponent({
            filter,
            componentType: "SELECT_MENU",
            time: 30000, // 5min
        });
    } catch (error) {
        // a la fin des 5min, on enleve le select
        await interaction.editReply({ components: [] });
        return;
    }
    // on enleve le select
    await interaction.editReply({ components: [] });
    const value = itrSelect.values[0];

    // on créé l'apercu avec l'option d'achat
    createAchatCustom(interaction, userDb, type, customItems, value);
}

async function createAchatCustom(
    interaction,
    userDb,
    type,
    customItems,
    value,
) {
    const dbConfig = customItems[type].db;
    const finalVal = customItems[type].values[value];

    // boutons
    // const backBtn = new MessageButton()
    //     .setCustomId("back")
    //     .setLabel('Retour')
    //     .setEmoji('⬅')
    //     .setStyle('PRIMARY')

    // recup settings de l'user
    const configProfile = await interaction.client.getOrInitProfile(userDb);
    // - si user a déjà acheté => "Utiliser" "enabled"
    let bought =
        typeof getJsonValue(configProfile, dbConfig, new Map()).get(value) !==
        "undefined";

    const buyBtn = new ButtonBuilder()
        .setCustomId("buy")
        .setLabel(`${bought ? "Utiliser" : "Acheter"}`)
        .setEmoji(`${bought ? "✅" : "💸"}`)
        .setStyle(`${bought ? ButtonStyle.Primary : ButtonStyle.Danger}`)
        .setDisabled(`${bought ? false : userDb.money < finalVal.price}`);

    let embed = new EmbedBuilder()
        .setColor(NIGHT)
        .setTitle("💰 BOUTIQUE - PROFILE - PRÉVISUALISATION 💰")
        .setDescription(`${finalVal.name}
        💰 ${finalVal.price}`)
        .setFooter({ text: `💵 ${userDb.money} ${process.env.MONEY}` });

    const row = new ActionRowBuilder().addComponents(
        // backBtn,
        buyBtn,
    );

    const msgCustomEmbed = await interaction.editReply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
    });

    // Collect button interactions
    const collector = msgCustomEmbed.createMessageComponentCollector({
        filter: ({ user }) => user.id === interaction.member.id,
        time: 300000, // 5min
    });

    collector.on("collect", async (itr) => {
        // on recréé le message
        if (itr.customId === "buy") {
            if (value === "custom") {
                // - si custom, attente d'un message de l'user
                embed = new EmbedBuilder()
                    .setColor(NIGHT)
                    .setTitle("En attente de ta couleur..")
                    .setDescription(`Quelle couleur souhaites-tu pour ***${customItems[type].title}*** ?
                        Réponds ta couleur au format héxadécimal ! (ex: #008000 (vert))`)
                    .setFooter({
                        text: `💵 ${userDb.money} ${process.env.MONEY}`,
                    });

                await interaction.editReply({
                    embeds: [embed],
                    components: [],
                });

                try {
                    const filter = (m) => {
                        return m.author.id === interaction.member.id;
                    };
                    const response = await msgCustomEmbed.channel.awaitMessages(
                        {
                            filter,
                            max: 1,
                            time: 300000,
                        },
                    );
                    let daColor = response.first().content;

                    // regex #000 ou #000000
                    if (daColor.match(/^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/)) {
                        // MAJ
                        daColor = daColor.toUpperCase();

                        // si couleur déjà présente ?
                        bought =
                            typeof getJsonValue(
                                configProfile,
                                dbConfig,
                                new Map(),
                            ).get(daColor) !== "undefined";

                        // sinon on achete/utilise
                        const query = { userId: userDb.userId };
                        let update = { $set: {} };

                        // on met a false toutes les options (s'il y en a)
                        getJsonValue(
                            configProfile,
                            dbConfig,
                            new Map(),
                        ).forEach(async (value, key) => {
                            update.$set[`profile.${dbConfig}.${key}`] = false;
                            await User.findOneAndUpdate(query, update);
                        });

                        // maj config user
                        update = { $set: {} };
                        update.$set[`profile.${dbConfig}.${daColor}`] = true;
                        await User.findOneAndUpdate(query, update);

                        // si pas acheté, on enleve argent
                        if (!bought) {
                            await interaction.client.update(userDb, {
                                money: userDb.money - finalVal.price,
                            });

                            // log
                            createLogs(
                                interaction.client,
                                interaction.guildId,
                                "Argent perdu",
                                `${interaction.member} achète ***${finalVal.name}*** pour ***${customItems[type].title}***`,
                            );
                        }

                        embed = new EmbedBuilder()
                            .setColor(GREEN)
                            .setTitle("💰 BOUTIQUE - PROFILE 💰")
                            .setDescription(`***${daColor}*** pour ***${
                                customItems[type].title
                            }*** ${bought ? "sélectionnée" : "achetée"} !
                                Va voir sur ton profile ! \`/profile\``)
                            .setFooter({
                                text: `💵 ${userDb.money} ${process.env.MONEY}`,
                            });

                        // reply
                        await interaction.editReply({
                            embeds: [embed],
                            components: [],
                        });
                    } else {
                        embed = new EmbedBuilder()
                            .setColor(DARK_RED)
                            .setTitle("Erreur")
                            .setDescription(`La couleur n'est pas au bon format ! (format hexa)
                                Pour retenter, il faut relancer la commande !`)
                            .setFooter({
                                text: `💵 ${userDb.money} ${process.env.MONEY}`,
                            });

                        await interaction.editReply({
                            embeds: [embed],
                            components: [],
                        });
                    }

                } catch (err) {
                    logger.error(err);
                    embed = new EmbedBuilder()
                        .setColor(DARK_RED)
                        .setTitle("Erreur")
                        .setDescription(
                            "Petit soucis, essaie de renseigner à temps ! ou bien vérifier si la couleur existe (format HEX)",
                        )
                        .setFooter({
                            text: `💵 ${userDb.money} ${process.env.MONEY}`,
                        });

                    await interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });
                }
            } else {
                // sinon on achete/utilise
                const query = { userId: userDb.userId };
                let update = { $set: {} };

                // on met a false toutes les options (s'il y en a)
                getJsonValue(configProfile, dbConfig, new Map()).forEach(
                    async (value, key) => {
                        update.$set[`profile.${dbConfig}.${key}`] = false;
                        await User.findOneAndUpdate(query, update);
                    },
                );

                // maj config user
                update = { $set: {} };
                update.$set[`profile.${dbConfig}.${value}`] = true;
                await User.findOneAndUpdate(query, update);

                // si pas acheté, on enleve argent
                if (!bought) {
                    await interaction.client.update(userDb, {
                        money: userDb.money - finalVal.price,
                    });

                    // log
                    createLogs(
                        interaction.client,
                        interaction.guildId,
                        "Argent perdu",
                        `${interaction.member} achète ***${finalVal.name}*** pour ***${customItems[type].title}***`,
                    );
                }

                embed = new EmbedBuilder()
                    .setColor(GREEN)
                    .setTitle("💰 BOUTIQUE - PROFILE 💰")
                    .setDescription(`***${finalVal.name}*** pour ***${
                        customItems[type].title
                    }*** ${bought ? "sélectionnée" : "achetée"} !
                        Va voir sur ton profile ! \`/profile\``)
                    .setFooter({
                        text: `💵 ${userDb.money} ${process.env.MONEY}`,
                    });

                // reply
                await interaction.editReply({
                    embeds: [embed],
                    components: [],
                });
            }
        }
    });

    // apres 5 min, on "ferme"
    collector.on("end", () => {
        msgCustomEmbed.edit({
            embeds: [embed],
            components: [],
        });
    });
}

exports.custom = custom;
