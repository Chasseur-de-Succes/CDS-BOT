const { createEmbed } = require("../../envoiMsg");
const {
    SEASONS,
    ENEMIES,
    MESSAGE,
} = require("../../../data/event/tower/constants.json");
const {
    getRandomPrivateJokes,
    displayHealth,
    endSeason,
} = require("./towerUtils");
const { TowerBoss } = require("../../../models");

// SAISON 0
// Créer un boss si aucun n'existe (saison 0)
async function createBoss(season, isHiddenBoss) {
    const infoBoss = isHiddenBoss
        ? ENEMIES["0"].HIDDEN_BOSS
        : ENEMIES["0"].BOSS;

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

async function seasonZero(
    client,
    guild,
    guildId,
    interaction,
    userDb,
    author,
    gameName,
    appid,
) {
    // Si l'utilisateur n'est pas encore arrivé au boss
    if (userDb.event.tower.etage <= SEASONS["0"].MAX_ETAGE) {
        // 1er étage franchi (1 jeu complété)
        if (userDb.event.tower.etage === 1) {
            logger.info({
                prefix: "TOWER",
                message: `${author.user.tag} 100% ${gameName} (${appid}): 1er étage ..`,
            });
            // 1er message d'intro
            let descFirst = `${MESSAGE["0"].FIRST}`;
            descFirst = descFirst
                .replace(/\${gameName}/g, gameName)
                .replace(/\${author}/g, author);
            return interaction.editReply({
                embeds: [
                    await createEmbed({
                        title: `🏆 ${gameName} terminé !`,
                        url: `https://store.steampowered.com/app/${appid}/`,
                        desc: descFirst,
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
                await createBoss(0, false);

                let firstboss = MESSAGE["0"].FIRST_BOSS.replace(
                    /\${author}/g,
                    author,
                ).replace(
                    /\${palier}/g,
                    userDb.event.tower.etage / SEASONS["0"].ETAGE_PAR_PALIER,
                );
                return interaction.editReply({
                    embeds: [
                        await createEmbed({
                            title: `🏆 ${gameName} terminé !`,
                            url: `https://store.steampowered.com/app/${appid}/`,
                            desc: `${firstboss}`,
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
                season: 0,
                hidden: true,
            });
            if (!hiddenBossCreated) {
                logger.info({
                    prefix: "TOWER",
                    message: `${author.user.tag} 100% ${gameName} (${appid}): dernier palier..`,
                });
                let descPalier = MESSAGE["0"].BOSS_PALIER.replace(
                    /\${author}/g,
                    author,
                ).replace(
                    /\${palier}/g,
                    userDb.event.tower.etage / SEASONS["0"].ETAGE_PAR_PALIER,
                );
                return interaction.editReply({
                    embeds: [
                        await createEmbed({
                            title: `🏆 ${gameName} terminé !`,
                            url: `https://store.steampowered.com/app/${appid}/`,
                            desc: descPalier,
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
            let descSommet = MESSAGE["0"].SOMMET.replace(
                /\${author}/g,
                author,
            ).replace(
                /\${palier}/g,
                userDb.event.tower.etage / SEASONS["0"].ETAGE_PAR_PALIER,
            );
            return interaction.editReply({
                embeds: [
                    await createEmbed({
                        title: `🏆 ${gameName} terminé !`,
                        url: `https://store.steampowered.com/app/${appid}/`,
                        desc: descSommet,
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
                    userDb.event.tower.etage / SEASONS["0"].ETAGE_PAR_PALIER
                }..`,
            });

            let descPalier = MESSAGE["0"].PALIER.replace(
                /\${gameName}/g,
                gameName,
            )
                .replace(/\${author}/g, author)
                .replace(
                    /\${palier}/g,
                    userDb.event.tower.etage / SEASONS["0"].ETAGE_PAR_PALIER,
                );
            return interaction.editReply({
                embeds: [
                    await createEmbed({
                        title: `🏆 ${gameName} terminé !`,
                        url: `https://store.steampowered.com/app/${appid}/`,
                        desc: descPalier,
                        color: "#1cff00",
                        footer: {
                            text: `Étage ${
                                userDb.event.tower.etage
                            }/??, Palier ${
                                userDb.event.tower.etage /
                                SEASONS["0"].ETAGE_PAR_PALIER
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
        let descEtage = MESSAGE["0"].ETAGE.replace(
            /\${author}/g,
            author,
        ).replace(/\${gameName}/g, gameName);
        return interaction.editReply({
            embeds: [
                await createEmbed({
                    title: `🏆 ${gameName} terminé !`,
                    url: `https://store.steampowered.com/app/${appid}/`,
                    desc: descEtage,
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

    // Récupère le boss courant non mort
    const currentBoss = await TowerBoss.findOne({
        season: 0,
        hp: { $ne: 0 },
    });

    // Mettre à jour les dégâts infligés et enregistrer
    userDb.event.tower.totalDamage += SEASONS["0"].DAMAGE; // On tape le tower
    await userDb.save();

    currentBoss.hp -= SEASONS["0"].DAMAGE; // On tape
    await currentBoss.save();

    if (currentBoss.hp <= 0) {
        if (currentBoss.hidden) {
            logger.info({
                prefix: "TOWER",
                message: `${author.user.tag} 100% ${gameName} (${appid}): tue boss caché, fin event, backup les infos ..`,
            });
            // si boss caché meurt, on arrête TOUT et on backup la saison
            await endSeason(client, 0, guild);

            let descEnd = MESSAGE["0"].END.replace(
                /\${gameName}/g,
                gameName,
            ).replace(/\${author}/g, author);

            return interaction.editReply({
                embeds: [
                    await createEmbed({
                        title: `🏆 ${gameName} terminé !`,
                        url: `https://store.steampowered.com/app/${appid}/`,
                        desc: descEnd,
                        color: "#ff00fc",
                        footer: {
                            text: "C'est trop calme..",
                        },
                    }),
                ],
            });
        }

        // - si 1er boss dead, gestion du boss caché
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): tue le boss, création boss caché ..`,
        });
        await createBoss(0, true);

        let descHiddenBoss = MESSAGE["0"].HIDDEN_BOSS.replace(
            /\${gameName}/g,
            gameName,
        ).replace(/\${author}/g, author);
        return interaction.editReply({
            embeds: [
                await createEmbed({
                    title: `🏆 ${gameName} terminé !`,
                    url: `https://store.steampowered.com/app/${appid}/`,
                    desc: descHiddenBoss,
                    color: "#ff00fc",
                    footer: {
                        text: "Il n'a pas l'air commode",
                    },
                }),
            ],
        });
    }

    // Boss toujours en vie
    logger.info({
        prefix: "TOWER",
        message: `${author.user.tag} 100% ${gameName} (${appid}): hit ${SEASONS["0"].DAMAGE}..`,
    });
    let desc100 = MESSAGE["0"].HIT.replace(/\${gameName}/g, gameName)
        .replace(/\${boss}/g, currentBoss.name)
        .replace(/\${author}/g, author);
    const embed = await createEmbed({
        title: `🏆 ${gameName} terminé !`,
        url: `https://store.steampowered.com/app/${appid}/`,
        desc: desc100,
        color: "#ff00fc",
        footer: {
            text: `${getRandomPrivateJokes()}`,
        },
    });
    embed.addFields({
        name: `${currentBoss.hp}/${currentBoss.maxHp}`,
        value: `${displayHealth(currentBoss)}`,
    });

    return interaction.editReply({
        embeds: [embed],
        ephemeral: true,
    });
}

module.exports = { seasonZero };
