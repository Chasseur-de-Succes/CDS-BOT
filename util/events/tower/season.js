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
const { AttachmentBuilder } = require("discord.js");
const { init } = require("../../mongoose");

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
                    createEmbed({
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
                        createEmbed({
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
                        createEmbed({
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
                    createEmbed({
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
                    createEmbed({
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
                createEmbed({
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
    userDb.event.tower.totalDamage += SEASONS["0"].DAMAGE;
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
                    createEmbed({
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
                createEmbed({
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
    const embed = createEmbed({
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

async function seasonOne(
    client,
    guild,
    guildId,
    interaction,
    userDb,
    author,
    gameName,
    appid,
) {
    // si jeu caché donné par les admins
    const hiddenMap = SEASONS["1"].HIDDEN_GAME_APPID;
    const appidStr = String(appid);
    const isHiddenApp = hiddenMap && Object.prototype.hasOwnProperty.call(hiddenMap, appidStr);

    // récupère les genres/tags
    const genres = await client.fetchAppGenres(appid);
    const tags = await client.fetchTags(appid);

    // récupère les genres/tags du mois
    // TODO créer méthode dans guildConfig pour ça ?
    const monthIndex = new Date().getMonth();
    const monthlyGenres = guild.event.tower.monthlyGenres[monthIndex];
    const monthlyTags = guild.event.tower.monthlyTags[monthIndex];

    let genresFoundArr = [];
    for (const g of genres) {
        const match = monthlyGenres.find((m) => m.id === g.id);
        if (match) genresFoundArr.push(match.label);
    }
    let isMonthlyGenre = genresFoundArr.length > 0;
    const genresFound = genresFoundArr.join(", ");

    let tagsFoundArr = [];
    for (const t of tags) {
        const match = monthlyTags.find((m) => m.id === t.id);
        if (match) tagsFoundArr.push(match.label);
    }
    let isMonthlyTag = tagsFoundArr.length > 0;
    const tagFound = tagsFoundArr.join(", ");
    // pour les embeds
    const infoBonus = {
        isHiddenApp,
        genresFound,
        tagFound,
    }

    // par défaut, on monte d'un étage
    let step = 1;
    // si jeu caché ou tag du mois, on monte d'un étage supplémentaire
    if (isHiddenApp || isMonthlyGenre || isMonthlyTag) {
        step++;
    }

    // 1er étage franchi (1 jeu complété)
    if (userDb.event.tower.etage === 1) {
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): 1er étage ..`,
        });
        // ici, on peut monter de 2 étages si jeu caché ou tag du mois, on ne risque rien
        userDb.event.tower.currentEtage += step;
        await userDb.save();

        // 1er message d'intro
        const descFirst = initDesc(MESSAGE["1"].FIRST, gameName, author)
        return interaction.editReply({
            embeds: [
                initEmbed(`🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descFirst,
                    "#1cff00",
                    "Étage 1/??",
                    infoBonus
                ),
            ],
            ephemeral: true,
        });
    }

    // Vérifier si l'utilisateur atteint un nouveau palier
    // on ajuste le step si on atteint un palier avant la fin du step
    let isPalierAtteint = false;
    for (let i = 1; i <= step; i++) {
        isPalierAtteint |= ((userDb.event.tower.currentEtage + i) % SEASONS["1"].ETAGE_PAR_PALIER === 0);
        if (isPalierAtteint) {
            step = i;
            break;
        }
    }

    // Si l'utilisateur n'est pas encore arrivé à un palier (boss)
    if (!isPalierAtteint) {
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): étage++ ..`,
        });
        // palier non atteint, on peut monter directement le step complet
        userDb.event.tower.currentEtage += step;
        await userDb.save();

        const descEtage = initDesc(MESSAGE["1"].ETAGE, gameName, author)
        return interaction.editReply({
            embeds: [
                initEmbed(`🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descEtage,
                    "#1cff00",
                    `Étage ${userDb.event.tower.currentEtage}/??`,
                    infoBonus
                ),
            ],
            ephemeral: true,
        });
    }

    // dans le cas où on arrive à un palier, on incrémente d'abord l'étage courant
    if ((userDb.event.tower.currentEtage + step) % SEASONS["1"].ETAGE_PAR_PALIER === 0) {
        userDb.event.tower.currentEtage += step;
        await userDb.save();
    }

    let currentBossIndex = (userDb.event.tower.currentEtage / SEASONS["1"].ETAGE_PAR_PALIER) - 1;
    // Si l'utilisateur est arrivé à un palier (boss)
    const bossCreated = await TowerBoss.exists({
        season: 1,
        ordre: currentBossIndex,
    });

    // si boss du palier pas encore créé, on le crée
    if (!bossCreated) {
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): arrivé palier, création boss ${currentBossIndex}..`,
        });
        const newBossInfo = ENEMIES["1"][currentBossIndex];
        const newBoss = await new TowerBoss({
            name: newBossInfo.name,
            hp: newBossInfo.hp,
            maxHp: newBossInfo.hp,
            season: 1,
            ordre: currentBossIndex,
        });
        await newBoss.save();
        userDb.event.tower.currentBoss = newBoss.ordre;
        await userDb.save();

        const descBoss = initDesc(MESSAGE["1"].BOSS[currentBossIndex].created, gameName, author)
        const imgBoss = new AttachmentBuilder(
            `data/img/event/tower/${newBossInfo.image.alive}`,
        );
        const footerBoss = randomFooter(currentBossIndex);

        return interaction.editReply({
            embeds: [
                initEmbed(`🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descBoss,
                    "#ff0000",
                    footerBoss,
                    infoBonus
                )
                    .setImage(`attachment://${newBossInfo.image.alive}`)
            ],
            files: [imgBoss],
        });
    }

    // Récupère le boss du palier
    const currentBoss = await TowerBoss.findOne({
        season: 1,
        ordre: currentBossIndex,
    });
    // si boss du palier créé ET mort
    if (currentBoss.hp <= 0) {
        // mais qu'on est déjà à ce palier
        if (userDb.event.tower.currentBoss === currentBoss.ordre) {
            logger.info({
                prefix: "TOWER",
                message: `${author.user.tag} 100% ${gameName} (${appid}): etage++ car boss mort ..`,
            });
            userDb.event.tower.currentEtage += step;
            await userDb.save();

            return interaction.editReply({
                embeds: [
                    initEmbed(`🏆 ${gameName} terminé !`,
                        `https://store.steampowered.com/app/${appid}/`,
                        `${currentBoss.name} étant vaincu, tu continues ton ascension !`,
                        "#1cff00",
                        `Étage ${userDb.event.tower.currentEtage}/??`,
                        infoBonus
                    ),
                ],
                ephemeral: true,
            });
        }

        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): arrivé palier, boss mort ..`,
        });
        userDb.event.tower.currentBoss = currentBoss.ordre;
        await userDb.save();

        // const descPalierBoss = MESSAGE["1"].BOSS[currentBossIndex].dead
        const descPalierBoss = initDesc(MESSAGE["1"].DEAD_BOSS, gameName, author, currentBoss.name, currentBossIndex + 1)
        const footerPalierBoss = randomFooter(currentBossIndex);
        return interaction.editReply({
            embeds: [
                initEmbed(`🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descPalierBoss,
                    "#ff0000",
                    footerPalierBoss,
                    infoBonus
                ),
            ],
        });
    }

    // boss pas mort et utilisateur vient d'arriver
    if (userDb.event.tower.currentBoss < currentBoss.ordre) {
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): arrivé palier, rejoins combat(${currentBoss.ordre}) ..`,
        });
        userDb.event.tower.currentBoss = currentBoss.ordre;
        await userDb.save();

        const bossInfo = ENEMIES["1"][currentBossIndex];
        const descRejointBoss = initDesc(MESSAGE["1"].JOIN_BOSS, gameName, author, currentBoss.name, currentBossIndex + 1)
        const footerRejointBoss = randomFooter(currentBossIndex);
        const imgBoss = new AttachmentBuilder(
            `data/img/event/tower/${bossInfo.image.alive}`,
        );

        return interaction.editReply({
            embeds: [
                initEmbed(`🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descRejointBoss,
                    "#ff0000",
                    footerRejointBoss,
                    infoBonus
                )
                    .setImage(`attachment://${bossInfo.image.alive}`)
            ],
            files: [imgBoss],
        });
    }

    // Mettre à jour les dégâts infligés et enregistrer
    let dmg = SEASONS["1"].DAMAGE;
        // si jeu caché ou tag du mois, dommage bonus
    if (isHiddenApp || isMonthlyGenre || isMonthlyTag) {
        dmg++;
    }
    userDb.event.tower.totalDamage += dmg;
    await userDb.save();

    // On tape
    currentBoss.hp -= dmg;
    await currentBoss.save();

    // si mort du boss
    if (currentBoss.hp <= 0) {
        currentBoss.killedBy = userDb;
        await currentBoss.save();

        // si dernier boss, fin de la saison
        if (currentBossIndex + 1 >= SEASONS["1"].NB_PALIERS) {
            logger.info({
                prefix: "TOWER",
                message: `${author.user.tag} 100% ${gameName} (${appid}): tue dernier boss, fin event, backup les infos ..`,
            });
            // si dernier boss meurt, on arrête TOUT et on backup la saison
            await endSeason(client, 1, guild);

            const bossInfo = ENEMIES["1"][currentBossIndex];
            const descEnd = initDesc(MESSAGE["1"].END, gameName, author)
            const imgBoss = new AttachmentBuilder(
                `data/img/event/tower/${bossInfo.image.dead}`,
            );

            return interaction.editReply({
                embeds: [
                    initEmbed(`🏆 ${gameName} terminé !`,
                        `https://store.steampowered.com/app/${appid}/`,
                        descEnd,
                        "#ff0000",
                        "La tour est enfin pacifiée..",
                        infoBonus
                    )
                        .setImage(`attachment://${bossInfo.image.dead}`)
                ],
                files: [imgBoss],
            });
        }

        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): tue le boss ${currentBoss.ordre}..`,
        });

        const bossInfo = ENEMIES["1"][currentBossIndex];
        const descBossDead = initDesc(MESSAGE["1"].BOSS[currentBossIndex].killed, gameName, author)
        const footerBossDead = randomFooter(currentBossIndex);
        const imgBoss = new AttachmentBuilder(
            `data/img/event/tower/${bossInfo.image.dead}`,
        );

        return interaction.editReply({
           embeds: [
               initEmbed(`🏆 ${gameName} terminé !`,
                   `https://store.steampowered.com/app/${appid}/`,
                   descBossDead,
                   "#ff0000",
                   footerBossDead,
                   infoBonus
               )
                    .setImage(`attachment://${bossInfo.image.dead}`)
           ],
           files: [imgBoss],
        });
    } else {
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): hit ${dmg}..`,
        });

        // non ephemeral si point de vie a atteint un palier (25%, 50%, 75%)
        let ephemeral = true;
        const hpRatio = currentBoss.hp / currentBoss.maxHp;
        if (hpRatio <= 0.75 && hpRatio > 0.5 && !currentBoss.hit25) {
            ephemeral = false;
            currentBoss.hit25 = true;
            await currentBoss.save();
        } else if (hpRatio <= 0.5 && hpRatio > 0.25 && !currentBoss.hit50) {
            ephemeral = false;
            currentBoss.hit50 = true;
            await currentBoss.save();
        } else if (hpRatio <= 0.25 && hpRatio > 0 && !currentBoss.hit75) {
            ephemeral = false;
            currentBoss.hit75 = true;
            await currentBoss.save();
        }

        const descHit = initDesc(MESSAGE["1"].HIT, gameName, author, currentBoss.name)
        const embed = initEmbed(`🏆 ${gameName} terminé !`,
                `https://store.steampowered.com/app/${appid}/`,
                descHit,
                "#ff0000",
                randomFooter(currentBossIndex),
                infoBonus
            )
        embed.addFields({
            name: `${currentBoss.hp}/${currentBoss.maxHp}`,
            value: `${displayHealth(currentBoss)}`,
        });

        return interaction.editReply({
            embeds: [embed],
            ephemeral: ephemeral,
        });
    }
}

function initDesc(desc, gameName = "", author = "", boss = "", palier = "") {
    return desc
        .replace(/\${gameName}/g, gameName)
        .replace(/\${author}/g, author)
        .replace(/\${boss}/g, boss)
        .replace(/\${palier}/g, palier);
}

function initEmbed(title, url, desc, color, footer, infoBonus) {
    const embed = createEmbed({
        title: title,
        url: url,
        desc: desc,
        color: color,
        footer: {
            // TODO en paramètre le random joke
            text: `${footer} | ${getRandomPrivateJokes()}`,
        },
    });
    if (infoBonus.isHiddenApp) {
        embed.addFields({
            name: "🎯 Bonus caché !",
            value: "Tu as complété un jeu caché par les admins !",
        });
    }
    if (infoBonus.genresFound) {
        embed.addFields({
            name: "📚 Genre(s) du mois !",
            value: `Ton jeu correspond au(x) genre(s) du mois : ${infoBonus.genresFound} !`,
        });
    }
    if (infoBonus.tagFound) {
        embed.addFields({
            name: "🏷️ Tag(s) du mois !",
            value: `Ton jeu correspond au(x) tag(s) du mois : ${infoBonus.tagFound} !`,
        });
    }
    return embed;
}

function randomFooter(bossIndex) {
    const footers = MESSAGE["1"].BOSS[bossIndex].footer;
    return footers[Math.floor(Math.random() * footers.length)];
}

module.exports = { seasonZero, seasonOne };
