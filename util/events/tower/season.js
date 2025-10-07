const { createLogs, createEmbed } = require("../../envoiMsg");
const {
    SEASONS,
    BOSSES,
    HIDDEN_BOSS,
    BOSS,
    ETAGE_PAR_PALIER,
    MAX_ETAGE,
    DAMAGE,
    ASCII_FIRST,
    ASCII_PALIER,
    ASCII_BOSS_FIRST_TIME,
    ASCII_BOSS_PALIER,
    ASCII_100,
    ASCII_NOT_100,
    ASCII_HIDDEN_BOSS_FIRST_TIME,
    ASCII_HIDDEN_BOSS_PALIER,
    ASCII_END,
    ASCII_FIRST_BAD_ENDING,
    ASCII_SECOND_BAD_ENDING,
    ASCII_START_BAD_ENDING,
} = require("../../../data/event/tower/constants.json");
const { getRandomPrivateJokes } = require("./towerUtils");
const { TowerBoss } = require("../../../models");

// SAISON 0
// Créer un boss si aucun n'existe (saison 0)
async function createBoss(season, isHiddenBoss) {
    const infoBoss = isHiddenBoss ? HIDDEN_BOSS : BOSS;

    const newBoss = await new TowerBoss({
        name: infoBoss.name,
        hp: infoBoss.hp,
        maxHp: infoBoss.hp,
        season: season,
        hidden: isHiddenBoss,
    });

    await newBoss.save();
    return newBoss;
}

async function seasonZero(client, guildId, interaction, userDb, author, gameName, appid) {
    // Vérifier si l'utilisateur a déjà 100% le jeu
    if (userDb.event.tower.completedGames.includes(appid)) {
        logger.warn({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): déjà fait ..`,
        });
        return await interaction.reply({
            content: `Tu as déjà utilisé ${gameName}.. ce n'est pas très efficace.`,
            ephemeral: true,
        });
    }

    userDb.event.tower.etage += 1; // On monte d'un étage
    userDb.event.tower.completedGames.push(appid); // Ajouter l'appId aux jeux déjà 100%
    await userDb.save();

    // logs
    createLogs(
        client,
        guildId,
        "🗼 TOWER : Nouveau jeu validé",
        `${author} vient de valider **${gameName}** (${appid}) !`,
        "",
        "#DC8514",
    );

    // Si l'utilisateur n'est pas encore arrivé au boss
    if (userDb.event.tower.etage <= SEASONS["0"].MAX_ETAGE) {
        // 1er étage franchi (1 jeu complété)
        if (userDb.event.tower.etage === 1) {
            logger.info({
                prefix: "TOWER",
                message: `${author.user.tag} 100% ${gameName} (${appid}): 1er étage ..`,
            });
            // 1er message d'intro
            return interaction.reply({
                embeds: [
                    await createEmbed({
                        title: `🏆 ${gameName} terminé !`,
                        url: `https://store.steampowered.com/app/${appid}/`,
                        desc: `En complétant **${gameName}**, ${author} ressent assez d'énergie pour pénétrer dans la tour, et gravir les escaliers, pour atteindre le premier **étage** !
${ASCII_FIRST}`,
                        color: "#1cff00",
                        footer: {
                            text: `Étage 1/?? | ${getRandomPrivateJokes()}`,
                        },
                    }),
                ],
                ephemeral: true,
            });
        }

        // Si l'utilisateur est arrivé à l'étage du boss (MAX_ETAGE jeux complétés)
        if (userDb.event.tower.etage === SEASONS["0"].MAX_ETAGE) {
            const bossCreated = await TowerBoss.exists({
                season: 0,
                hidden: false,
            });

            // Si boss pas créé, on le crée
            if (!bossCreated) {
                logger.info({
                    prefix: "TOWER",
                    message: `${author.user.tag} 100% ${gameName} (${appid}): dernier palier, création 1er boss..`,
                });
                const newBoss = await createBoss(0, false);

                return interaction.reply({
                    embeds: [
                        await createEmbed({
                            title: `🏆 ${gameName} terminé !`,
                            url: `https://store.steampowered.com/app/${appid}/`,
                            desc: `${author} a atteint le **palier ${
                                userDb.event.tower.etage / ETAGE_PAR_PALIER
                            }** et est arrivé au sommet de la tour !!
${author} aperçoit au loin une ombre menaçante.\n
En se rapprochant, ${author} reconnait très clairement le cupide \`${
                                newBoss.name
                            }\`..\n
Attention, il fonce droit sur vous !!
${ASCII_BOSS_FIRST_TIME}`,
                            color: "#ff0000",
                            footer: {
                                text: `"Tiens, un jeu gratuit !" 😈`,
                            },
                        }),
                    ],
                });
            }

            // Si boss caché pas encore créé, on rejoint le combat contre le 1er
            const hiddenBossCreated = await TowerBoss.exists({
                season: season,
                hidden: true,
            });
            if (!hiddenBossCreated) {
                logger.info({
                    prefix: "TOWER",
                    message: `${author.user.tag} 100% ${gameName} (${appid}): dernier palier..`,
                });
                return interaction.reply({
                    embeds: [
                        await createEmbed({
                            title: `🏆 ${gameName} terminé !`,
                            url: `https://store.steampowered.com/app/${appid}/`,
                            desc: `${author} a atteint le **palier ${
                                userDb.event.tower.etage / ETAGE_PAR_PALIER
                            }** et est arrivé au sommet de la tour !!
${author} aperçoit au loin d'autres joueurs menant une rude bataille..
${author} prends part au combat !
${ASCII_BOSS_PALIER}`,
                            color: "#ff0000",
                            footer: {
                                text: "Enfin en haut !",
                            },
                        }),
                    ],
                });
            }

            // Si boss caché créé, le 1er est mort, on rejoint le combat contre le 2ème
            logger.info({
                prefix: "TOWER",
                message: `${author.user.tag} 100% ${gameName} (${appid}): dernier palier, 1er boss mort..`,
            });
            const deadBoss = await TowerBoss.findOne({
                season: season,
                hp: { $eq: 0 },
                hidden: false,
            });
            const currentBoss = await TowerBoss.findOne({
                season: season,
                hp: { $ne: 0 },
            });
            return interaction.reply({
                embeds: [
                    await createEmbed({
                        title: `🏆 ${gameName} terminé !`,
                        url: `https://store.steampowered.com/app/${appid}/`,
                        desc: `${author} a atteint le **palier ${
                            userDb.event.tower.etage / ETAGE_PAR_PALIER
                        }** et est arrivé au sommet de la tour !!
Mais ${author} trébuche sur le cadavre de \`${deadBoss.name}\`...
En se relevant, ${author} voit ses coéquipiers faire face au grand \`${
                            currentBoss.name
                        }\`\n
${author} prends part au combat !
${ASCII_HIDDEN_BOSS_PALIER}`,
                        color: "#ff00fc",
                        footer: {
                            text: "Mieux vaux tard que jamais",
                        },
                    }),
                ],
            });
        }

        // Vérifier si l'utilisateur atteint un nouveau palier
        if (userDb.event.tower.etage % SEASONS["0"].ETAGE_PAR_PALIER === 0) {
            logger.info({
                prefix: "TOWER",
                message: `${
                    author.user.tag
                } 100% ${gameName} (${appid}): nouveau palier ${
                    userDb.event.tower.etage / ETAGE_PAR_PALIER
                }..`,
            });

            return interaction.reply({
                embeds: [
                    await createEmbed({
                        title: `🏆 ${gameName} terminé !`,
                        url: `https://store.steampowered.com/app/${appid}/`,
                        desc: `En complétant **${gameName}**, ${author} arrive au **palier ${
                            userDb.event.tower.etage / ETAGE_PAR_PALIER
                        }** !
            Ce palier est vide.. les escaliers montent toujours et les bruits sont de plus en plus oppressants.
${ASCII_PALIER}`,
                        color: "#1cff00",
                        footer: {
                            text: `Étage ${
                                userDb.event.tower.etage
                            }/??, Palier ${
                                userDb.event.tower.etage / ETAGE_PAR_PALIER
                            }/?? | ${getRandomPrivateJokes()}`,
                        },
                    }),
                ],
            });
        }

        // Utilisateur monte d'un étage
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): étage++ ..`,
        });
        return interaction.reply({
            embeds: [
                await createEmbed({
                    title: `🏆 ${gameName} terminé !`,
                    url: `https://store.steampowered.com/app/${appid}/`,
                    desc: `En complétant **${gameName}**, ${author} gravit les escaliers et monte d'un étage !`,
                    color: "#1cff00",
                    footer: {
                        text: `Étage ${
                            userDb.event.tower.etage
                        }/?? | ${getRandomPrivateJokes()}`,
                    },
                }),
            ],
            ephemeral: true,
        });
    }
}

module.exports = { seasonZero };