const { createError } = require("../../../util/envoiMsg");
const {
    HIDDEN_BOSS,
    BOSS,
    ETAGE_PAR_PALIER,
    MAX_ETAGE,
    ASCII_FIRST,
    ASCII_PALIER,
    ASCII_BOSS_FIRST_TIME,
    ASCII_BOSS_PALIER,
    ASCII_100,
    ASCII_NOT_100,
    ASCII_HIDDEN_BOSS_FIRST_TIME,
    ASCII_HIDDEN_BOSS_PALIER,
    ASCII_END,
    PRIVATE_JOKES,
} = require("../../../data/event/tower/constants.json");
const { TowerBoss, GuildConfig, User } = require("../../../models");
const { EmbedBuilder } = require("discord.js");

// Récupère une private joke aléatoirement
function getRandomPrivateJokes() {
    return PRIVATE_JOKES[Math.floor(Math.random() * PRIVATE_JOKES.length)];
}

// Calcul le pourcentage de vie restant du boss donné, retourne une suite d'émoji
function displayHealth(boss) {
    const totalHP = 5;
    const filledRatio = (boss.hp / boss.maxHp) * totalHP; // Ratio de cases pleines
    const filledHP = Math.floor(filledRatio); // Cases totalement remplies (arrondi inférieur)
    const hasIntermediate = filledRatio > filledHP; // Vérifie s'il reste une fraction pour une case intermédiaire
    const emptyHP = totalHP - filledHP - (hasIntermediate ? 1 : 0); // Cases vides

    // Sélection des émojis de couleur selon le ratio de vie
    let filledEmoji = "🟩"; // Par défaut, plein de vie
    if (boss.hp / boss.maxHp <= 0.3) filledEmoji = "🟥"; // Faible santé
    else if (boss.hp / boss.maxHp <= 0.6) filledEmoji = "🟨"; // Santé moyenne
    const intermediateEmoji = "🟧"; // Émoji intermédiaire
    const emptyEmoji = "⬜"; // Cases vides plus douces

    return `${filledEmoji.repeat(filledHP)}${
        hasIntermediate ? intermediateEmoji : ""
    }${emptyEmoji.repeat(emptyHP)}`;
}

// Créer un boss si aucun n'existe
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

// Créer et renvoie un embed
async function createEmbed(option) {
    return new EmbedBuilder()
        .setTitle(option.title)
        .setDescription(option.desc)
        .setColor(option.color)
        .setURL(option.url)
        .setFooter(option.footer);
}

const validerJeu = async (interaction, options) => {
    const guildId = interaction.guildId;
    const guild = await GuildConfig.findOne({ guildId: guildId });
    let appid = options.getInteger("appid");
    appid = !appid ? options.get("jeu")?.value : appid;

    const author = interaction.member;
    const client = interaction.client;

    // Récupérer l'utilisateur
    const userDb = await client.getUser(author);
    if (!userDb) {
        // Si pas dans la BDD
        return await interaction.reply({
            embeds: [
                createError(
                    `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    // si la saison n'a pas encore commencé (à faire manuellement via commage '<préfix>tower start')
    if (!guild.event.tower.started) {
        logger.info(".. événement tower pas encore commencé");
        return await interaction.reply({
            embeds: [createError("L'événement n'a pas encore commencé..")],
        });
    }

    // si pas inscrit
    if (typeof userDb.event.tower.startDate === "undefined") {
        return await interaction.reply({
            embeds: [
                createError(
                    "Tu dois d'abord t'inscrire à l'événement (via `/tower inscription`) !",
                ),
            ],
            ephemeral: true,
        });
    }

    // appid doit être tjs présent
    if (!appid) {
        return await interaction.reply({
            embeds: [
                createError(
                    "Tu dois spécifier au moins un appID ou chercher le jeu que tu as complété",
                ),
            ],
            ephemeral: true,
        });
    }

    const season = guild.event.tower.currentSeason;

    // teste si les boss sont en vie, sinon on skip
    const allBossDead = await TowerBoss.exists({
        $and: [
            {
                season: season,
                hp: { $eq: 0 },
                hidden: false,
            },
            {
                season: season,
                hp: { $eq: 0 },
                hidden: true,
            },
        ],
    });

    // - ne devrait normalement jamais être exécuté
    if (allBossDead) {
        logger.info(".. tous les boss sont DEAD ..");
        return await interaction.reply({
            content: "L'événement est terminé ! Revenez peut être plus tard..",
            ephemeral: true,
        });
    }

    // récupération des infos des succès sur le jeu sélectionné via Steam
    const steamId = userDb.steamId;
    // TODO gestion erreur connexion ?
    const { error, gameName, hasAllAchievements, finishedAfterStart } =
        await client.hasAllAchievementsAfterDate(
            steamId,
            appid,
            guild.event.tower.startDate,
        );

    if (error) {
        logger.warn(
            `.. erreur lors de la recherche de succès pour l'appid ${appid} :\n${error}`,
        );
        // Recup nom du jeu, si présent dans la bdd
        const gameDb = await client.findGameByAppid(appid);
        // TODO si gameDb non trouvé
        return await interaction.reply({
            content: `${gameDb?.name} (${appid}) n'a même pas de succès..`,
            ephemeral: true,
        });
    }

    if (!finishedAfterStart) {
        logger.warn({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): avant le début de l'event ..`,
        });
        return await interaction.reply({
            content: `Tu as terminé ${gameName} **avant** le début de l'événement.. Celui-ci ne peut être pris en compte.`,
            ephemeral: true,
        });
    }

    if (hasAllAchievements) {
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

        // Si l'utilisateur n'est pas encore arrivé au boss
        if (userDb.event.tower.etage <= MAX_ETAGE) {
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
            if (userDb.event.tower.etage === MAX_ETAGE) {
                const bossCreated = await TowerBoss.exists({
                    season: season,
                    hidden: false,
                });

                // Si boss pas créé, on le crée
                if (!bossCreated) {
                    logger.info({
                        prefix: "TOWER",
                        message: `${author.user.tag} 100% ${gameName} (${appid}): dernier palier, création 1er boss..`,
                    });
                    const newBoss = await createBoss(season, false);
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

                const hiddenBossCreated = await TowerBoss.exists({
                    season: season,
                    hidden: true,
                });

                // Si boss caché pas encore créé, on rejoint le combat contre le 1er
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
            if (userDb.event.tower.etage % ETAGE_PAR_PALIER === 0) {
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
                        desc: `En complétant **${gameName}**, ${author} gravir les escaliers et monte d'un étage !`,
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
            season: season,
            hp: { $ne: 0 },
        });

        // Mettre à jour les dégâts infligés et enregistrer
        const damage = 1; // modifiable ?
        userDb.event.tower.totalDamage += damage; // On tape le tower
        await userDb.save();

        currentBoss.hp -= damage;
        await currentBoss.save();

        if (currentBoss.hp <= 0) {
            if (currentBoss.hidden) {
                logger.info({
                    prefix: "TOWER",
                    message: `${author.user.tag} 100% ${gameName} (${appid}): tue boss caché, fin event, backup les infos ..`,
                });
                // si boss caché meurt, on arrête TOUT et on backup la saison
                await endSeason(season, guild);

                return interaction.reply({
                    embeds: [
                        await createEmbed({
                            title: `🏆 ${gameName} terminé !`,
                            url: `https://store.steampowered.com/app/${appid}/`,
                            desc: `En complétant **${gameName}**, ${author} porte le coup fatal à \`${currentBoss.name}\`!! Bravo !
Le calme est revenu au sommet de cette tour. Vous pouvez vous reposer après cette lutte acharnée.
C'est la fin..
${ASCII_END}`,
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
            const hiddenBoss = await createBoss(season, true);

            return interaction.reply({
                embeds: [
                    await createEmbed({
                        title: `🏆 ${gameName} terminé !`,
                        url: `https://store.steampowered.com/app/${appid}/`,
                        desc: `En complétant **${gameName}**, ${author} porte le coup fatal à \`${currentBoss.name}\`! Bravo !
Alors que son corps tombe à terre, ${author} entend grogner au loin..

C'est \`${hiddenBoss.name}\`, son acolyte, qui bondit et qui veut venger son maître !
${ASCII_HIDDEN_BOSS_FIRST_TIME}`,
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
            message: `${author.user.tag} 100% ${gameName} (${appid}): hit ${damage}..`,
        });
        const embed = await createEmbed({
            title: `🏆 ${gameName} terminé !`,
            url: `https://store.steampowered.com/app/${appid}/`,
            desc: `En complétant **${gameName}**, ${author} inflige **${damage} point de dégats** à \`${currentBoss.name}\`!
${ASCII_100}`,
            color: "#ff00fc",
            footer: {
                text: `${getRandomPrivateJokes()}`,
            },
        });
        embed.addFields({
            name: `${currentBoss.hp}/${currentBoss.maxHp}`,
            value: `${displayHealth(currentBoss)}`,
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    }

    return interaction.reply({
        embeds: [
            await createEmbed({
                title: `🛑 Tu n'as pas encore complété ${gameName}..`,
                url: `https://store.steampowered.com/app/${appid}/`,
                desc: `Il semblerait que tu n'es pas eu tous les succès de **${gameName}**..
${ASCII_NOT_100}`,
                color: "#0019ff",
                footer: {
                    text: "C'est une erreur ? Oups.. contacte un admin !",
                },
            }),
        ],
        ephemeral: true,
    });
};

async function endSeason(seasonNumber, guild) {
    logger.info({
        prefix: "TOWER",
        message: `fin de la saison ${seasonNumber} ..`,
    });

    // Edite Guild Config
    guild.event.tower.started = false;
    // on garde une trace
    guild.event.tower.history.push({
        season: guild.event.tower.currentSeason,
        startDate: guild.event.tower.startDate,
        endDate: Date.now(),
        finished: true,
    });
    await guild.save();

    // Récupérer tous les utilisateurs qui ont participé
    const users = await User.find({
        "event.tower.startDate": { $exists: true },
    });

    // Sauvegarder les informations de la saison actuelle pour chaque utilisateur
    const endDate = Date.now();
    for (const user of users) {
        await endSeasonForUser(user, endDate, seasonNumber);
    }
}

async function endSeasonForUser(user, endDate, seasonNumber) {
    // Sauvegarder les données de la saison actuelle dans l'historique
    user.event.tower.seasonHistory.push({
        seasonNumber: seasonNumber,
        endDate: endDate,
        maxEtage: user.event.tower.etage,
        totalDamage: user.event.tower.totalDamage,
    });

    // Réinitialiser les données pour la nouvelle saison
    user.event.tower.startDate = undefined;
    user.event.tower.etage = 0;
    user.event.tower.totalDamage = 0;
    // user.completedGames = [];
    // user.season = seasonNumber + 1;

    await user.save();
}

exports.validerJeu = validerJeu;
exports.endSeasonForUser = endSeasonForUser;
