const {
    createError,
    createEmbed,
    createLogs,
} = require("../../../util/envoiMsg");
const {
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
const { TowerBoss, GuildConfig, User } = require("../../../models");
const { SALON } = require("../../../util/constants");
const { daysDiff } = require("../../../util/util");
const { EmbedBuilder } = require("discord.js");
const {isAllBossDead} = require("../../../util/events/towerUtils");
const { displayHealth, getRandomPrivateJokes, endSeasonForUser } = require("../../../util/events/tower/towerUtils");
const { seasonZero } = require("../../../util/events/tower/season");

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

    // Récupération du channel de l'event
    const eventChannelId = await interaction.client.getGuildChannel(
        interaction.guild.id,
        SALON.EVENT_TOWER,
    );

    // Gestion d'erreur si aucun salon n'est défini
    if (!eventChannelId) {
        return interaction.reply({
            content: `Aucun salon de l'évènement tower n'a été trouvé.`,
            ephemeral: true,
        });
    }

    // Test si le salon de l'interaction est celui de l'événement
    if (interaction.channelId !== eventChannelId) {
        return await interaction.reply({
            embeds: [
                createError(
                    `Tu dois valider ton jeu dans le salon <#${eventChannelId}> !`,
                ),
            ],
            ephemeral: true,
        });
    }

    // si la saison n'a pas encore commencé (à faire manuellement via commage '<préfix>tower start')
    if (!guild.event.tower.started) {
        logger.info(".. évènement tower pas encore commencé");
        return await interaction.reply({
            embeds: [createError("L'évènement n'a pas encore commencé..")],
        });
    }

    // si pas inscrit
    if (typeof userDb.event.tower.startDate === "undefined") {
        return await interaction.reply({
            embeds: [
                createError(
                    "Tu dois d'abord t'inscrire à l'évènement (via `/tower inscription`) !",
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
    const allBossDead = await isAllBossDead(season);

    // - ne devrait normalement jamais être exécuté
    if (allBossDead) {
        logger.info(".. tous les boss sont DEAD ..");
        return await interaction.reply({
            content: "L'évènement est terminé ! Revenez peut être plus tard..",
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
            content: `Tu as terminé ${gameName} **avant** le début de l'évènement.. Celui-ci ne peut être pris en compte.`,
            ephemeral: true,
        });
    }

    if (hasAllAchievements) {
        // TODO fonctionnement différent en fonction de la saison
        // Saison 0 : Tour à 20 étages, avec 2 boss dont un caché
        switch (season) {
            case 0:
                // gestion de la saison 0 dans un fichier séparé
                return seasonZero(client, guildId, interaction, userDb, author, gameName, appid);
        }
        // TODO Saison N+1 : Tour à X étages, avec un boss à chaque palier (admin CDS)
        // TODO Saison N+2 : Participant réparti en plusieurs équipes (2 ou 3), 2/3 tour à X étages, un boss différent pour chaque équipe -> a réfléchir

        // Récupère le boss courant non mort
        const currentBoss = await TowerBoss.findOne({
            season: season,
            hp: { $ne: 0 },
        });

        // Mettre à jour les dégâts infligés et enregistrer
        userDb.event.tower.totalDamage += DAMAGE; // On tape le tower
        await userDb.save();

        currentBoss.hp -= DAMAGE; // On tape
        await currentBoss.save();

        if (currentBoss.hp <= 0) {
            if (currentBoss.hidden) {
                logger.info({
                    prefix: "TOWER",
                    message: `${author.user.tag} 100% ${gameName} (${appid}): tue boss caché, fin event, backup les infos ..`,
                });
                // si boss caché meurt, on arrête TOUT et on backup la saison
                await endSeason(client, season, guild);

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
            message: `${author.user.tag} 100% ${gameName} (${appid}): hit ${DAMAGE}..`,
        });
        const embed = await createEmbed({
            title: `🏆 ${gameName} terminé !`,
            url: `https://store.steampowered.com/app/${appid}/`,
            desc: `En complétant **${gameName}**, ${author} inflige **${DAMAGE} point de dégats** à \`${currentBoss.name}\`!
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

/**
 * Fin de la saison, backup des infos
 */
async function endSeason(client, seasonNumber, guild, cancelled = false) {
    logger.info({
        prefix: "TOWER",
        message: `fin de la saison ${seasonNumber} ..`,
    });
    createLogs(
        client,
        guild.guildId,
        !cancelled
            ? `🗼 TOWER : Saison ${seasonNumber} terminée`
            : `🗼 TOWER : Saison ${seasonNumber} arrêtée`,
        !cancelled ? "Évènement terminé !" : "Évènement arrêté !",
        `en ${daysDiff(guild.event.tower.startDate, Date.now())} jours`,
        "#DC8514",
    );

    // Edite Guild Config
    guild.event.tower.started = false;
    // on garde une trace
    guild.event.tower.history.push({
        season: guild.event.tower.currentSeason,
        startDate: guild.event.tower.startDate,
        endDate: Date.now(),
        finished: !cancelled,
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

    // Envoi d'un message de fin
    if (cancelled) {
        // si on arrête l'event manuellement, un boss est forcément encore en vie
        const currentBoss = await TowerBoss.findOne({
            season: seasonNumber,
            hp: { $ne: 0 },
        });

        const eventChannelId = await client.getGuildChannel(
            guild.guildId,
            SALON.EVENT_TOWER,
        );
        const eventChannel = client.channels.cache.get(eventChannelId);

        // si boss pas mort
        let embedEnd = new EmbedBuilder()
            .setTitle("Fin de l'évènement")
            // .setDescription(option.desc)
            .setColor("#ff0000")
            .setFooter({
                text: "Seuls ceux qui ne font rien n'échouent pas..",
            });

        if (currentBoss && currentBoss.hp > 0) {
            // si le boss est le boss caché
            if (currentBoss.hidden) {
                const deadBoss = await TowerBoss.findOne({
                    season: seasonNumber,
                    hidden: false,
                });
                embedEnd.setDescription(
                    `
Malgré tous vos efforts communs, vous n'avez pas réussi à vaincre \`${currentBoss.name}\`..
En prenant le corps de \`${deadBoss.name}\`, \`${currentBoss.name}\` éjecte tout le monde de la tour.
Il s'enfuit, furieux de ne pas avoir pu venger son maître..
${ASCII_SECOND_BAD_ENDING}`,
                );
            } else {
                embedEnd.setDescription(
                    `Malgré tous vos efforts communs, vous n'avez pas réussi à vaincre \`${currentBoss.name}\`..
Celui-ci éjecte tout le monde de la tour, et vous le voyez s'enfuir au loin, suivi de près par une ombre..
${ASCII_FIRST_BAD_ENDING}`,
                );
            }
        } else {
            embedEnd.setDescription(
                `Vous tournez en rond dans la tour, mais personne n'arrive à trouver le sommet..
${ASCII_START_BAD_ENDING}`,
            );
        }
        eventChannel.send({ embeds: [embedEnd] });
    }
}

exports.validerJeu = validerJeu;
exports.endSeason = endSeason;
