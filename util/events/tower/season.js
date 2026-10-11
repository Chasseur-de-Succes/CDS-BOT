const { createEmbed, createLogs } = require("../../envoiMsg");
const {
    SEASONS,
    ENEMIES,
    MESSAGE,
} = require("../../../data/event/tower/constants.json");
const {
    getRandomPrivateJokes,
    displayHealth,
    endSeason,
    healBoss,
} = require("./towerUtils");
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { SALON, NEW_SALON } = require("../../constants");
const moment = require("moment");
const { GuildConfigRepository, TowerRepository, TowerStatsRepository } = require("../../../repositories");

async function seasonOne(
    client,
    guildId,
    interaction,
    userDb,
    author,
    gameName,
    appid,
    firstUnlock,
) {
    // Récupération du channel de l'event
    const eventChannelId = await GuildConfigRepository.getChannel(interaction.guild.id, NEW_SALON.EVENT_TOWER);

    // si jeu caché donné par les admins
    const hiddenMap = SEASONS["1"].HIDDEN_GAME_APPID;
    const appidStr = String(appid);
    const isHiddenApp =
        hiddenMap && Object.prototype.hasOwnProperty.call(hiddenMap, appidStr);

    // récupère les genres/tags
    const genres = await client.fetchAppGenres(appid);
    const tags = await client.fetchTags(appid);

    // 1 requête PG : la tour en cours + les fields du mois + l'id du message épinglé
    const tower = await TowerRepository.findByGuildIdAndStarted(guildId);
    const monthFields = await TowerRepository.findMonthlyFields(tower?.msgClueId);

    const genreOrder = new Map(genres.map((g, i) => [g.id, i]));
    const tagOrder = new Map(tags.map((t, i) => [t.tagId, i]));
    const rank = (f) =>
        (f.type === "genre" ? genreOrder.get(f.value) : tagOrder.get(f.value)) ?? 0;

    // genres d'abord, puis tags, dans l'ordre Steam
    const matches = monthFields
        .filter((f) => (f.type === "genre" ? genreOrder : tagOrder).has(f.value))
        .sort((a, b) =>
            a.type !== b.type ? (a.type === "genre" ? -1 : 1) : rank(a) - rank(b),
        );

    const genresFoundArr = matches.filter((f) => f.type === "genre").map((f) => f.name);
    const tagsFoundArr = matches.filter((f) => f.type === "tag").map((f) => f.name);

    const isMonthlyGenre = genresFoundArr.length > 0;
    const genresFound = genresFoundArr.join(", ");
    const isMonthlyTag = tagsFoundArr.length > 0;
    const tagFound = tagsFoundArr.join(", ");
    const foundIds = matches.map((f) => f.id);

    // difference entre la date du premier succès et auj
    const nbDiffYears = Math.abs(
        moment(firstUnlock).diff(moment(), "years", true),
    );

    // pour les embeds
    const infoBonus = {
        isHiddenApp,
        genresFound,
        tagFound,
    };

    // si tag/genre du mois, on maj le message "indice"
    const idMsg = monthFields[0]?.idMsg;
    const newlyFound = matches.filter((f) => !f.found);

    if (foundIds.length > 0 && idMsg && newlyFound.length > 0) {
        const msgClue = await client.channels.cache
            .get(eventChannelId)
            .messages.fetch(idMsg)
            .catch(() => null);

        if (msgClue) {
            await Promise.all(
                newlyFound.map((f) => TowerRepository.update(f.id, { found: true })),
            );
            newlyFound.forEach((f) => (f.found = true));

            // 1 seule édition du message au lieu d'une par field
            const newEmbed = EmbedBuilder.from(msgClue.embeds[0]).setFields(
                monthFields.map((f) => ({
                    name: f.found ? f.name : "???",
                    value: f.found ? f.name : "???",
                    inline: true,
                })),
            );
            await msgClue.edit({ embeds: [newEmbed] });
        }
    }

    // par défaut, on monte d'un étage
    let step = 1;
    // si jeu caché / tag du mois / backlog, on monte d'un étage supplémentaire
    const nbYearsSmallBonus =
        process.env.NB_YEARS_SMALL_BONUS || SEASONS["1"].NB_YEARS_SMALL_BONUS;
    const nbYearsBonus =
        process.env.NB_YEARS_BONUS || SEASONS["1"].NB_YEARS_BONUS;
    if (
        isHiddenApp ||
        isMonthlyGenre ||
        isMonthlyTag ||
        nbDiffYears >= nbYearsSmallBonus
    ) {
        // par defaut 1 bonus
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
        const dateFirstUnlock = moment(firstUnlock).format("DD/MM/YYYY");
        if (nbDiffYears >= nbYearsBonus) {
            // backlog bonus
            step++;
            desc += `> -- 1er succès il y a DÉJÀ ${nbYearsBonus} ans !\n`;
            // ajout dans infoBonus
            infoBonus.nbYearsBonus = nbYearsBonus;
            infoBonus.dateFirstUnlock = dateFirstUnlock;
        } else if (nbDiffYears >= nbYearsSmallBonus) {
            desc += `> -- 1er succès il y a déjà ${nbYearsSmallBonus} ans !\n`;
            // ajout dans infoBonus
            infoBonus.nbYearsBonus = nbYearsSmallBonus;
            infoBonus.dateFirstUnlock = dateFirstUnlock;
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

    // récup info tower de l'user
    let towerStat = await TowerStatsRepository.findByUserAndSeason(userDb, 1);

    // 1er étage franchi (1 jeu complété)
    if (towerStat.nbValidatedGames === 1) {
        // ici, on peut monter de N étages si jeu caché ou tag du mois, on ne risque rien
        const updatedTowerStat = await TowerStatsRepository.incrementCurrentFloor(userDb, 1, step);

        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): étage ${updatedTowerStat.currentFloor} ..`,
        });

        // 1er message d'intro
        const descFirst = initDesc(MESSAGE["1"].FIRST, gameName, author);
        return interaction.editReply({
            embeds: [
                initEmbed(
                    `🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descFirst,
                    "#1cff00",
                    `Étage ${updatedTowerStat.currentFloor}/?? | ${getRandomPrivateJokes()}`,
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
            (towerStat.currentFloor + i) %
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
        const updatedTowerStat = await TowerStatsRepository.incrementCurrentFloor(userDb, 1, step);

        const descEtage = initDesc(MESSAGE["1"].ETAGE, gameName, author);
        return interaction.editReply({
            embeds: [
                initEmbed(
                    `🏆 ${gameName} terminé !`,
                    `https://store.steampowered.com/app/${appid}/`,
                    descEtage,
                    "#1cff00",
                    `Étage ${updatedTowerStat.currentFloor}/??  | ${getRandomPrivateJokes()}`,
                    infoBonus,
                ),
            ],
        });
    }

    // dans le cas où on arrive à un palier, on incrémente d'abord l'étage courant
    if (
        (towerStat.currentFloor + step) %
            SEASONS["1"].ETAGE_PAR_PALIER ===
        0
    ) {
        // si step 0 (on est pile au palier), on monte d'un étage
        towerStat = await TowerStatsRepository.incrementCurrentFloor(
            userDb,
            1,
            step,
        );
    }

    const currentBossIndex =
        towerStat.currentFloor / SEASONS["1"].ETAGE_PAR_PALIER - 1;
    // Récupère le boss pré-créé du palier (via la tour courante)
    const currentBoss = await TowerRepository.findBoss(
        tower.id,
        1,
        currentBossIndex,
    );
    if (!currentBoss) {
        logger.warn({
            prefix: "TOWER",
            message: `${author.user.tag}: boss introuvable pour le palier ${currentBossIndex} ..`,
        });
        return interaction.editReply({
            content:
                "Aucun boss n'est défini pour ce palier.. préviens un admin !",
        });
    }

    // si le boss du palier n'est pas encore révélé, on le révèle
    if (!currentBoss.isDiscovered) {
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): arrivé palier, révélation boss ${currentBossIndex}..`,
        });
        await TowerRepository.revealBoss(currentBoss.id);
        await TowerStatsRepository.setCurrentBoss(userDb, 1, currentBoss.id);

        const newBossInfo = ENEMIES["1"][currentBossIndex];
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

    // si boss du palier mort
    if (currentBoss.hp <= 0) {
        // mais qu'on est déjà à ce palier
        if (towerStat.currentBoss === currentBoss.id) {
            logger.info({
                prefix: "TOWER",
                message: `${author.user.tag} 100% ${gameName} (${appid}): etage++ car boss mort ..`,
            });
            // dans le cas où on est déjà au palier, où step peut être égal à 0
            let updatedTowerStat =
                await TowerStatsRepository.incrementCurrentFloor(
                    userDb,
                    1,
                    Math.max(step, 1),
                );
            // si step 0 et si jeu caché ou tag du mois, on monte d'un étage supplémentaire (non pris en compte avant)
            if (step === 0 && (isHiddenApp || isMonthlyGenre || isMonthlyTag)) {
                updatedTowerStat =
                    await TowerStatsRepository.incrementCurrentFloor(
                        userDb,
                        1,
                        1,
                    );
            }

            return interaction.editReply({
                embeds: [
                    initEmbed(
                        `🏆 ${gameName} terminé !`,
                        `https://store.steampowered.com/app/${appid}/`,
                        `${currentBoss.name} étant déjà vaincu, tu continues ton ascension !`,
                        "#1cff00",
                        `Étage ${updatedTowerStat.currentFloor}/?? | ${getRandomPrivateJokes()}`,
                        infoBonus,
                    ),
                ],
            });
        }

        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): arrivé palier, boss mort ..`,
        });
        await TowerStatsRepository.setCurrentBoss(userDb, 1, currentBoss.id);

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

    // boss vivant et utilisateur vient d'arriver
    if (towerStat.currentBoss !== currentBoss.id) {
        logger.info({
            prefix: "TOWER",
            message: `${author.user.tag} 100% ${gameName} (${appid}): arrivé palier, rejoint combat(${currentBoss.order}) ..`,
        });
        await TowerStatsRepository.setCurrentBoss(userDb, 1, currentBoss.id);

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
    let dmg = process.env.DAMAGE || SEASONS["1"].DAMAGE;
    // si jeu caché ou tag du mois, dommage bonus
    if (isHiddenApp || isMonthlyGenre || isMonthlyTag) {
        dmg++;
    }

    // si aucun tag ni genre du mois n'a été trouvé, il y a une petite chance que le jeu soigne le boss au lieu de le blesser.
    const HEAL_CHANCE =
        parseFloat(process.env.HEAL_CHANCE) || SEASONS["1"].HEAL_CHANCE;
    const willAttemptHeal = !isHiddenApp && !isMonthlyGenre && !isMonthlyTag; // aucun tag/genre trouvé ni un jeu caché
    const healTriggered = willAttemptHeal && Math.random() < HEAL_CHANCE;

    if (healTriggered) {
        // On soigne le boss au lieu d'infliger des dégâts
        await healBoss(currentBoss);

        // Log et message pour le salon event
        const descHeal = randomHealDesc();
        await createLogs(
            client,
            guildId,
            `🗼 - Malus : soin du boss`,
            descHeal,
            "",
            "#5DADE2",
        );

        const embedHeal = initEmbed(
            `🏥 Pas de chance...`,
            `https://store.steampowered.com/app/${appid}/`,
            descHeal,
            "#00b7ff",
            `Le boss récupère des forces...`,
            {},
        );
        embedHeal.addFields({
            name: `${currentBoss.hp}/${currentBoss.maxHp}`,
            value: `${displayHealth(currentBoss)}`,
        });

        await client.channels.cache
            .get(eventChannelId)
            .send({ embeds: [embedHeal] });

        return interaction.editReply(
            "Ton jeu a involontairement soigné le boss !",
        );
    }

    // si pas de soin, on applique les dégâts comme avant
    await TowerStatsRepository.addDamage(userDb, 1, dmg);

    // On tape
    const oldHp = currentBoss.hp;
    const newHp = oldHp - dmg;
    currentBoss.hp = newHp;
    await TowerRepository.patchBoss(currentBoss.id, { hp: newHp });

    // si mort du boss
    if (newHp <= 0) {
        currentBoss.killedBy = userDb.id;
        await TowerRepository.patchBoss(currentBoss.id, {
            killedBy: userDb.id,
        });

        // si dernier boss, fin de la saison
        if (currentBossIndex + 1 >= SEASONS["1"].NB_PALIERS) {
            logger.info({
                prefix: "TOWER",
                message: `${author.user.tag} 100% ${gameName} (${appid}): tue dernier boss, fin event, backup les infos ..`,
            });
            // si dernier boss meurt, on arrête TOUT et on backup la saison
            await endSeason(client, 1, guildId);

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
            message: `${author.user.tag} 100% ${gameName} (${appid}): tue le boss ${currentBoss.order}..`,
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

        // non ephemeral si un palier de vie (25%, 50%, 75%) vient d'être franchi
        let ephemeral = true;
        let msgRatio = "";
        const thresholds = [
            { ratio: 0.75, msg: "Déjà **25%** de vie en moins !" },
            { ratio: 0.5, msg: "Encore la **moitié** !" },
            { ratio: 0.25, msg: "Plus que **25%** !!" },
        ];
        const crossed = thresholds.find(
            (t) =>
                oldHp / currentBoss.maxHp > t.ratio &&
                newHp / currentBoss.maxHp <= t.ratio,
        );
        if (crossed) {
            ephemeral = false;
            msgRatio = crossed.msg;
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
            text: footer,
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
            value: `Un petit bonus car ton jeu correspond au **genre** : \`${infoBonus.genresFound}\` !`,
            inline: true,
        });
    }
    if (infoBonus.tagFound) {
        embed.addFields({
            name: "🏷️ Tag du mois !",
            value: `Un petit bonus car ton jeu correspond au **tag** : \`${infoBonus.tagFound}\` !`,
            inline: true,
        });
    }
    if (infoBonus.nbYearsBonus) {
        embed.addFields({
            name: "⏳ Backlog bonus !",
            value: `Ton premier succès date du \`${infoBonus.dateFirstUnlock}\`, soit il y a plus de \`${infoBonus.nbYearsBonus}\` ans ! 👴`,
            inline: true,
        });
    }
    return embed;
}

function randomFooter(bossIndex) {
    const footers = MESSAGE["1"].BOSS[bossIndex].footer;
    return footers[Math.floor(Math.random() * footers.length)];
}

function randomHealDesc() {
    const heals = MESSAGE["1"].HEAL;
    return heals[Math.floor(Math.random() * heals.length)];
}

module.exports = { seasonOne };
