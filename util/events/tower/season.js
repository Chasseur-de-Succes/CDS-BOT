const { createEmbed, createError, createLogs } = require("../../envoiMsg");
const {
    MONTHLY,
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
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { SALON } = require("../../constants");

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
    // Récupération du channel de l'event
    const eventChannelId = await interaction.client.getGuildChannel(
        interaction.guild.id,
        SALON.EVENT_TOWER,
    );

    // si jeu caché donné par les admins
    const hiddenMap = SEASONS["1"].HIDDEN_GAME_APPID;
    const appidStr = String(appid);
    const isHiddenApp =
        hiddenMap && Object.prototype.hasOwnProperty.call(hiddenMap, appidStr);

    // récupère les genres/tags
    const genres = await client.fetchAppGenres(appid);
    const tags = await client.fetchTags(appid);

    // récupère les genres/tags du mois
    const monthIndex = new Date().getMonth();
    const monthlyGenres = MONTHLY.GENRES[monthIndex];
    const monthlyTags = MONTHLY.TAGS[monthIndex];

    const foundIds = [];
    const genresFoundArr = [];
    for (const g of genres) {
        const match = monthlyGenres.find((m) => m.id == g.id);
        if (match) {
            foundIds.push(match.id);
            genresFoundArr.push(match.label);
        }
    }
    const isMonthlyGenre = genresFoundArr.length > 0;
    const genresFound = genresFoundArr.join(", ");

    const tagsFoundArr = [];
    for (const t of tags) {
        const match = monthlyTags.find((m) => m.id == t.tagId);
        if (match) {
            foundIds.push(match.id);
            tagsFoundArr.push(match.label);
        }
    }
    const isMonthlyTag = tagsFoundArr.length > 0;
    const tagFound = tagsFoundArr.join(", ");
    // pour les embeds
    const infoBonus = {
        isHiddenApp,
        genresFound,
        tagFound,
    };

    // si tag/genre du mois, on maj le message "indice"
    if (foundIds.length > 0) {
        if (guild.event.tower.currentMsgClue) {
            // recup le msg
            const msgClue = await client.channels.cache
                .get(eventChannelId)
                .messages.fetch(guild.event.tower.currentMsgClue.id)
                .catch(() => null);
            if (msgClue) {
                const fields = guild.event.tower.currentMsgClue.fields;
                const fieldsAlreadyFound = fields.filter((f) => f.found);

                for (const id of foundIds) {
                    // si pas encore trouvé
                    if (!fieldsAlreadyFound.find((f) => f.id == id)) {
                        // maj bdd
                        const fieldToUpdate = fields.find((f) => f.id == id);
                        fieldToUpdate.found = true;
                        guild.save();

                        // maj du msg
                        const newEmbed = EmbedBuilder.from(
                            await msgClue.embeds[0],
                        ).setFields(
                            fields.map((f) => {
                                return {
                                    name: f.found ? f.name : "???",
                                    value: f.found ? f.value : "???",
                                    inline: true,
                                };
                            }),
                        );
                        await msgClue.edit({ embeds: [newEmbed] });
                    }
                }
            }
        }
    }

    // par défaut, on monte d'un étage
    let step = 1;
    // si jeu caché ou tag du mois, on monte d'un étage supplémentaire
    if (isHiddenApp || isMonthlyGenre || isMonthlyTag) {
        step++;
        // log bonus
        let desc = "";
        if (isHiddenApp) {
            desc = `> -- jeu caché de \`${hiddenMap[appidStr]})\`\n`;
        }
        if (isMonthlyGenre) {
            desc += `> -- genre du mois (${genresFound})\n`;
        }
        if (isMonthlyTag) {
            desc += `> -- tag du mois (${tagFound})\n`;
        }
        await createLogs(
            client,
            guildId,
            `🗼 - Bonus validé`,
            desc,
            "",
            "#DC8514",
        );
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
        const descFirst = initDesc(MESSAGE["1"].FIRST, gameName, author);
        return interaction.editReply({
            embeds: [
                initEmbed(
                    `🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descFirst,
                    "#1cff00",
                    "Étage 1/??",
                    infoBonus,
                ),
            ],
        });
    }

    // Vérifier si l'utilisateur atteint un nouveau palier
    // on ajuste le step si on atteint un palier avant la fin du step
    let isPalierAtteint = false;
    for (let i = 0; i <= step; i++) {
        isPalierAtteint |=
            (userDb.event.tower.currentEtage + i) %
                SEASONS["1"].ETAGE_PAR_PALIER ===
            0;
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

        const descEtage = initDesc(MESSAGE["1"].ETAGE, gameName, author);
        return interaction.editReply({
            embeds: [
                initEmbed(
                    `🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descEtage,
                    "#1cff00",
                    `Étage ${userDb.event.tower.currentEtage}/??`,
                    infoBonus,
                ),
            ],
        });
    }

    // dans le cas où on arrive à un palier, on incrémente d'abord l'étage courant
    if (
        (userDb.event.tower.currentEtage + step) %
            SEASONS["1"].ETAGE_PAR_PALIER ===
        0
    ) {
        // si step 0 (on est pile au palier), on monte d'un étage
        userDb.event.tower.currentEtage += step;
        await userDb.save();
    }

    let currentBossIndex =
        userDb.event.tower.currentEtage / SEASONS["1"].ETAGE_PAR_PALIER - 1;
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

        const descBoss = initDesc(
            MESSAGE["1"].BOSS[currentBossIndex].created,
            gameName,
            author,
        );
        const imgBoss = new AttachmentBuilder(
            `data/img/event/tower/${newBossInfo.image.alive}`,
        );
        const footerBoss = randomFooter(currentBossIndex);

        // envoi direct
        await client.channels.cache.get(eventChannelId).send({
            embeds: [
                initEmbed(
                    `🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descBoss,
                    "#ff0000",
                    footerBoss,
                    infoBonus,
                ).setImage(`attachment://${newBossInfo.image.alive}`),
            ],
            files: [imgBoss],
        });
        return interaction.editReply("Le boss arrive !");
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
            // dans le cas où on est déjà au palier, où step peut être égal à 0
            userDb.event.tower.currentEtage += Math.max(step, 1);
            // si step 0 et si jeu caché ou tag du mois, on monte d'un étage supplémentaire (non pris en compte avant)
            if (step === 0 && (isHiddenApp || isMonthlyGenre || isMonthlyTag)) {
                userDb.event.tower.currentEtage++;
            }
            await userDb.save();

            return interaction.editReply({
                embeds: [
                    initEmbed(
                        `🏆 ${gameName} terminé !`,
                        `https://store.steampowered.com/app/${appid}/`,
                        `${currentBoss.name} étant déjà vaincu, tu continues ton ascension !`,
                        "#1cff00",
                        `Étage ${userDb.event.tower.currentEtage}/??`,
                        infoBonus,
                    ),
                ],
            });
        }

        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): arrivé palier, boss mort ..`,
        });
        userDb.event.tower.currentBoss = currentBoss.ordre;
        await userDb.save();

        // const descPalierBoss = MESSAGE["1"].BOSS[currentBossIndex].dead
        const descPalierBoss = initDesc(
            MESSAGE["1"].DEAD_BOSS,
            gameName,
            author,
            currentBoss.name,
            currentBossIndex + 1,
        );
        const footerPalierBoss = randomFooter(currentBossIndex);
        return interaction.editReply({
            embeds: [
                initEmbed(
                    `🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descPalierBoss,
                    "#ff0000",
                    footerPalierBoss,
                    infoBonus,
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
        const descRejointBoss = initDesc(
            MESSAGE["1"].JOIN_BOSS,
            gameName,
            author,
            currentBoss.name,
            currentBossIndex + 1,
        );
        const footerRejointBoss = randomFooter(currentBossIndex);
        const imgBoss = new AttachmentBuilder(
            `data/img/event/tower/${bossInfo.image.alive}`,
        );
        await client.channels.cache.get(eventChannelId).send({
            embeds: [
                initEmbed(
                    `🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descRejointBoss,
                    "#ff0000",
                    footerRejointBoss,
                    infoBonus,
                ).setImage(`attachment://${bossInfo.image.alive}`),
            ],
            files: [imgBoss],
        });
        return interaction.editReply(
            "Tu as rejoint le combat contre le boss !",
        );
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
            const descEnd = initDesc(MESSAGE["1"].END, gameName, author);
            const imgBoss = new AttachmentBuilder(
                `data/img/event/tower/${bossInfo.image.dead}`,
            );

            await client.channels.cache.get(eventChannelId).send({
                embeds: [
                    initEmbed(
                        `🏆 ${gameName} terminé !`,
                        `https://store.steampowered.com/app/${appid}/`,
                        descEnd,
                        "#ff0000",
                        "La tour est enfin pacifiée..",
                        infoBonus,
                    ).setImage(`attachment://${bossInfo.image.dead}`),
                ],
                files: [imgBoss],
            });
            return interaction.editReply("C'est fini pour toi aussi !");
        }

        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): tue le boss ${currentBoss.ordre}..`,
        });

        const bossInfo = ENEMIES["1"][currentBossIndex];
        const descBossDead = initDesc(
            MESSAGE["1"].BOSS[currentBossIndex].killed,
            gameName,
            author,
        );
        const footerBossDead = randomFooter(currentBossIndex);
        const imgBoss = new AttachmentBuilder(
            `data/img/event/tower/${bossInfo.image.dead}`,
        );

        await client.channels.cache.get(eventChannelId).send({
            embeds: [
                initEmbed(
                    `🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descBossDead,
                    "#ff0000",
                    footerBossDead,
                    infoBonus,
                ).setImage(`attachment://${bossInfo.image.dead}`),
            ],
            files: [imgBoss],
        });
        return interaction.editReply("Tu as vaincu le boss !");
    } else {
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): hit ${dmg}..`,
        });

        // non ephemeral si point de vie a atteint un palier (25%, 50%, 75%)
        let ephemeral = true;
        const hpRatio = currentBoss.hp / currentBoss.maxHp;
        let msgRatio = "";
        if (hpRatio <= 0.75 && hpRatio > 0.5 && !currentBoss.hit25) {
            ephemeral = false;
            currentBoss.hit25 = true;
            await currentBoss.save();
            msgRatio = "Déjà **25%** de vie en moins !";
        } else if (hpRatio <= 0.5 && hpRatio > 0.25 && !currentBoss.hit50) {
            ephemeral = false;
            currentBoss.hit50 = true;
            await currentBoss.save();
            msgRatio = "Encore la **moitié** !";
        } else if (hpRatio <= 0.25 && hpRatio > 0 && !currentBoss.hit75) {
            ephemeral = false;
            currentBoss.hit75 = true;
            await currentBoss.save();
            msgRatio = "Plus que **25%** !!";
        }

        const descHit = initDesc(
            MESSAGE["1"].HIT,
            gameName,
            author,
            currentBoss.name,
        );
        const embed = initEmbed(
            `🏆 ${gameName} terminé !`,
            `https://store.steampowered.com/app/${appid}/`,
            descHit,
            "#ff0000",
            randomFooter(currentBossIndex),
            infoBonus,
        );
        embed.addFields({
            name: `${currentBoss.hp}/${currentBoss.maxHp}`,
            value: `${displayHealth(currentBoss)}`,
        });

        if (!ephemeral) {
            embed.addFields({
                name: "ℹ️ Information",
                value: msgRatio,
                inline: true,
            });
            await client.channels.cache.get(eventChannelId).send({
                embeds: [embed],
            });
            return interaction.editReply("Ton attaque a porté ses fruits !");
        } else {
            return interaction.editReply({
                embeds: [embed],
            });
        }
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
            inline: true,
        });
    }
    if (infoBonus.genresFound) {
        embed.addFields({
            name: "📚 Genre du mois !",
            value: `Un petit bonus car ton jeu correspond au genre : ${infoBonus.genresFound} !`,
            inline: true,
        });
    }
    if (infoBonus.tagFound) {
        embed.addFields({
            name: "🏷️ Tag du mois !",
            value: `Un petit bonus car ton jeu correspond au tag : ${infoBonus.tagFound} !`,
            inline: true,
        });
    }
    return embed;
}

function randomFooter(bossIndex) {
    const footers = MESSAGE["1"].BOSS[bossIndex].footer;
    return footers[Math.floor(Math.random() * footers.length)];
}

module.exports = { seasonZero, seasonOne };
