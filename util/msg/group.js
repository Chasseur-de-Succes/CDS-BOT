const { scheduledJobs } = require("node-schedule");
const { Group, User } = require("../../models");
const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType,
} = require("discord.js");
const { DARK_RED, GREEN, YELLOW, NIGHT } = require("../../data/colors.json");
const { WARNING, CHECK_MARK, CROSS_MARK } = require("../../data/emojis.json");
const moment = require("moment-timezone");
const { BAREME_XP, SALON } = require("../constants");
const { addXp } = require("../xp");
const { getAchievement } = require("./stats");
const { feedBotMetaAch } = require("../envoiMsg");

/**
 * Retourne les @ des membres faisant partie du groupe, sauf le capitaine
 * @param {*} group Groupe (DB)
 * @param {*} members Collection de Members
 * @returns String, chaque @ suivi d'un saut de ligne
 */
function getMembersList(group, members) {
    const memberCaptain = members.get(group.captain.userId);
    let membersStr = "";
    // récupère les @ des membres
    for (const member of group.members) {
        const crtMember = members.get(member.userId);
        if (crtMember !== memberCaptain) membersStr += `${crtMember.user}\n`;
    }
    return membersStr ? membersStr : "*Personne 😔*";
}

/**
 * Créer un message embed contenant les infos d'un group
 * @param {*} members Collection de tous les membres
 * @param {*} group Groupe (DB)
 * @param {*} isAuthorCaptain est-ce que l'auteur du msg qui a appelé cette méthode est le capitaine
 * @returns un msg embed
 */
async function createEmbedGroupInfo(client, members, group, isAuthorCaptain) {
    const memberCaptain = members.get(group.captain.userId);
    const membersStr = getMembersList(group, members);
    let color;
    if (group.validated) {
        color = NIGHT;
    } else if (group.size === group.nbMax) {
        color = DARK_RED;
    } else if (group.size === 1) {
        color = GREEN;
    } else {
        color = YELLOW;
    }

    let dateEvent = "*Non définie*";
    if (group.dateEvent) {
        dateEvent = "";
        moment.locale("fr");
        for (const date of group.dateEvent
            .sort((a, b) => b.getTime() - a.getTime())
            .slice(0, 15)) {
            // moment(group.dateEvent).format("ddd Do MMM HH:mm")
            //dateEvent += `- ***${moment(date).format("ddd Do MMM HH:mm")}***\n`
            dateEvent += `- ***${moment
                .tz(date, "Europe/Paris")
                .format("ddd Do MMM HH:mm")}***\n`;
        }

        if (group.dateEvent.length > 15) {
            dateEvent += `et ${group.dateEvent.length - 15} autres...`;
        }
    }
    if (!dateEvent) {
        dateEvent = "*Non définie*";
    }

    const gameAppid = group.game.appid;
    const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${gameAppid})`;
    const completionistLink = `[Completionist](https://completionist.me/steam/app/${gameAppid})`;
    const steamGuidesLink = `[Steam Guides](https://steamcommunity.com/app/${gameAppid}/guides/?browsefilter=trend&requiredtags[]=Achievements#scrollTop=0)`;
    const links = `${astatLink} | ${completionistLink} | ${steamGuidesLink}`;

    // TODO icon plutot que l'image ? -> recup via API..
    const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${gameAppid}/header.jpg`;

    const newMsgEmbed = new EmbedBuilder()
        .setTitle(
            `${group.validated ? "🏁" : ""}${isAuthorCaptain ? "👑" : ""} **${
                group.name
            }**`,
        )
        .setColor(color)
        .setThumbnail(gameUrlHeader)
        .addFields(
            {
                name: "Jeu",
                value: `${group.game.name}\n${links}`,
                inline: true,
            },
            { name: "Quand ?", value: `${dateEvent}`, inline: true },
            { name: "\u200B", value: "\u200B", inline: true }, // 'vide' pour remplir le 3eme field et passé à la ligne
            { name: "Capitaine", value: `${memberCaptain.user}`, inline: true },
        );

    if (group.nbMax) {
        newMsgEmbed.addFields(
            {
                name: `Membres [${group.size}/${group.nbMax}]`,
                value: `${membersStr}`,
                inline: true,
            },
            { name: "\u200B", value: "\u200B", inline: true }, // 'vide' pour remplir le 3eme field et passé à la ligne
        );
    } else {
        newMsgEmbed.addFields(
            {
                name: `${group.size} membres`,
                value: `${membersStr}`,
                inline: true,
            },
            { name: "\u200B", value: "\u200B", inline: true }, // 'vide' pour remplir le 3eme field et passé à la ligne
        );
    }

    if (group.channelId) {
        const guild = await client.guilds.cache.get(group.guildId);
        if (guild) {
            const channel = await guild.channels.cache.get(group.channelId);

            if (channel) {
                newMsgEmbed.addFields(
                    { name: "Salon", value: `<#${channel.id}>`, inline: true },
                    //{ name: '\u200B', value: '\u200B', inline: true },                  // 'vide' pour remplir le 3eme field et passé à la ligne
                );
            }
        }
    }

    if (group.desc) {
        newMsgEmbed.setDescription(`*${group.desc}*`);
    }
    return newMsgEmbed;
}

/**
 * Crée un nouveau msg embed dans le channel spécifique
 * et le sauvegarde en DB
 * @param {*} client
 * @param {*} group Groupe (DB)
 */
async function sendMsgHubGroup(client, guildId, group) {
    const members = client.guilds.cache.get(guildId).members.cache;
    const newMsgEmbed = await createEmbedGroupInfo(
        client,
        members,
        group,
        false,
    );

    // recuperation id message pour pouvoir l'editer par la suite
    const idListGroup = await client.getGuildChannel(guildId, SALON.LIST_GROUP);
    if (idListGroup) {
        const msg = await client.channels.cache
            .get(idListGroup)
            .send({ embeds: [newMsgEmbed] });
        const row = await createRowGroupButtons(group);
        await msg.edit({ components: [row] });

        await client.update(group, { idMsg: msg.id });

        // nvx msg aide, pour recup + facilement
        await client.createMsgDmdeAide({
            //author: userDB, // bot
            msgId: msg.id,
            guildId: msg.guildId,
        });
    } else {
        logger.error(`Le channel de list group n'existe pas !`);
    }
}

/**
 * Update un msg embed du channel spécifique
 * @param {*} client
 * @param {*} group Groupe (DB)
 */
async function editMsgHubGroup(client, guildId, group) {
    const members = client.guilds.cache.get(guildId).members.cache;

    const idListGroup = await client.getGuildChannel(guildId, SALON.LIST_GROUP);
    if (idListGroup) {
        const msg = await client.channels.cache
            .get(idListGroup)
            .messages.fetch(group.idMsg);
        const editMsgEmbed = await createEmbedGroupInfo(
            client,
            members,
            group,
            false,
        );
        const footer = `${
            group.validated ? "TERMINÉ - " : ""
        }Dernière modif. ${moment().format("ddd Do MMM HH:mm")}`;

        editMsgEmbed.setFooter({ text: `${footer}` });

        // "maj" component row
        const row = await createRowGroupButtons(group);

        await msg.edit({ embeds: [editMsgEmbed], components: [row] });
    } else {
        logger.error(`Le channel de list group n'existe pas !`);
    }
}

/**
 * Supprime un message
 * @param {*} client
 * @param {*} group
 */
async function deleteMsgHubGroup(client, guildId, group) {
    const idListGroup = await client.getGuildChannel(guildId, SALON.LIST_GROUP);
    if (idListGroup) {
        const msg = await client.channels.cache
            .get(idListGroup)
            .messages.fetch(group.idMsg);
        await msg.delete();
    } else {
        logger.error(`Le channel de list group n'existe pas !`);
    }
}

function createRowGroupButtons(group) {
    const isFull = group.nbMax === group.members.length;
    const join = new ButtonBuilder()
        .setCustomId(`group-${group.id}-join`)
        .setEmoji(isFull ? WARNING : CHECK_MARK)
        .setLabel(isFull ? "Complet !" : "Rejoindre")
        .setStyle(ButtonStyle.Success)
        // disabled si max atteint
        .setDisabled(isFull);

    const leave = new ButtonBuilder()
        .setCustomId(`group-${group.id}-leave`)
        .setEmoji(CROSS_MARK)
        .setLabel("Quitter")
        .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder().addComponents(join, leave);
}

/**
 * Créer un collecteur (components) pour les messages Groupes
 * Si l'on clique sur le bouton "Rejoindre"', on s'ajoute au groupe (ssi on y est pas déjà et qu'on est pas le capitaine)
 * Si l'on clique sur le bouton "Quitter", on se retire du groupe (sauf si on est le capitaine)
 * @param {*} client
 * @param {*} msg le message
 */
async function createCollectorGroup(client, msg) {
    const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
    });

    collector.on("collect", async (i) => {
        await i.deferReply({ ephemeral: true });

        // récup info customID group-<id>-<action>
        const groupId = i.customId.split("-")[1];
        const action = i.customId.split("-")[2];
        const group = await Group.findOne({ _id: groupId }).populate(
            "captain members game",
        );
        const userDb = await client.findUserById(i.user.id);

        // Rejoindre le groupe
        if (action === "join") {
            // Utilisateur non enregistré
            if (!userDb) {
                return await i.editReply({
                    content: `${CROSS_MARK} Tu ne peux pas rejoindre le groupe, car tu n'es pas enregistré.\n:arrow_right: Enregistre toi avec la commande \`/register <steamid>\`.`,
                    ephemeral: true,
                });
            }

            // Utilisateur blacklisté
            if (userDb.blacklisted) {
                return await i.editReply({
                    content: `${CROSS_MARK} Tu ne peux pas rejoindre le groupe car tu es blacklisté.`,
                    ephemeral: true,
                });
            }

            // Groupe complet (le bouton est normalement grisé, mais on le garde au cas où)
            if (group.nbMax === group.size) {
                return await i.editReply({
                    content: `${CROSS_MARK} Tu ne peux pas rejoindre le groupe car celui-ci est complet.`,
                    ephemeral: true,
                });
            }

            // Utilisateur puni
            if (userDb.warning === 3) {
                return await i.editReply({
                    content: `${CROSS_MARK} Tu ne peux pas rejoindre le groupe car tu es puni.`,
                    ephemeral: true,
                });
            }

            // Utilisateur déjà dans le groupe
            if (group.members.find((us) => us.userId === userDb.userId)) {
                return await i.editReply({
                    content: `${CROSS_MARK} Tu ne peux pas rejoindre le groupe car tu es déjà membre de ce groupe.`,
                    ephemeral: true,
                });
            }

            // Utilisateur a trop d'événement en cours
            const nbGrps = await client.getNbOngoingGroups(userDb.userId);
            if (nbGrps === process.env.MAX_GRPS) {
                return await i.editReply({
                    content: `${CROSS_MARK} Tu ne peux pas rejoindre le groupe car tu as rejoins trop de groupes.`,
                    ephemeral: true,
                });
            }

            await joinGroup(client, msg.guildId, group, userDb);
            await i.editReply({
                content: "🥳 Tu as bien rejoint le groupe !",
                ephemeral: true,
            });
        }

        // Quitter le groupe
        if (action === "leave") {
            // Le capitaine ne peut pas quitter le groupe
            if (userDb.userId === group.captain.userId) {
                return await i.editReply({
                    content: `${CROSS_MARK} Tu ne peux pas quitter le groupe car tu es le capitaine. \nTu peux toujours transférer le statut de 👑capitaine vers un autre membre du groupe.`,
                    ephemeral: true,
                });
            }

            // Utilisateur hors du groupe
            if (!group.members.find((us) => us.userId === userDb.userId)) {
                return await i.editReply({
                    content: `${CROSS_MARK} Tu ne peux pas quitter le groupe car tu n'es pas membre.`,
                    ephemeral: true,
                });
            }

            await leaveGroup(client, msg.guildId, group, userDb);
            await i.editReply({
                content: "🥲 Tu as bien quitter le groupe !",
                ephemeral: true,
            });
        }
    });
}

/**
 * Enlève un utilisateur d'un groupe
 * @param {*} grp Le groupe
 * @param {*} userDB L'utilisateur a enlever
 */
async function leaveGroup(client, guildId, grp, userDb) {
    // update du groupe : size -1, remove de l'user dans members
    const memberGrp = grp.members.find((u) => u._id.equals(userDb._id));
    const indexMember = grp.members.indexOf(memberGrp);

    grp.members.splice(indexMember, 1);
    grp.size--;
    // fix au cas où
    if (grp.size === 0) {
        grp.size = 1;
    }
    await client.update(grp, {
        members: grp.members,
        size: grp.size,
        dateUpdated: Date.now(),
    });

    // update perm channel + send message
    if (grp.channelId) {
        const guild = await client.guilds.cache.get(guildId);
        const channel = await guild.channels.cache.get(grp.channelId);
        channel.permissionOverwrites?.delete(
            userDb.userId,
            "Membre a quitté le groupe",
        );

        // send message channel group
        channel.send(
            `> <@${userDb.userId}> a quitté le groupe (total : ${grp.size})`,
        );
    }

    // stat ++
    await User.updateOne(
        { _id: userDb._id },
        { $inc: { "stats.group.left": 1 } },
    );

    // update msg
    await editMsgHubGroup(client, guildId, grp);
    logger.info(`${userDb.username} vient de quitter groupe ${grp.name}`);
}

/**
 * Ajouter un utilisateur dans un groupe
 * @param {*} grp Le groupe
 * @param {*} userDB L'utilisateur
 */
async function joinGroup(client, guildId, grp, userDb) {
    grp.members.push(userDb);
    grp.size++;
    await client.update(grp, {
        members: grp.members,
        size: grp.size,
        dateUpdated: Date.now(),
    });

    // update perm channel + send message
    if (grp.channelId) {
        const guild = await client.guilds.cache.get(guildId);
        const channel = await guild.channels.cache.get(grp.channelId);

        channel.permissionOverwrites.edit(userDb.userId, {
            ViewChannel: true,
            SendMessages: true,
            MentionEveryone: true,
        });

        // send message channel group
        channel.send(
            `> <@${userDb.userId}> a rejoint le groupe (total : ${grp.size})`,
        );
    }

    // stat ++
    await User.updateOne(
        { _id: userDb._id },
        { $inc: { "stats.group.joined": 1 } },
    );

    // update msg
    await editMsgHubGroup(client, guildId, grp);
    logger.info(`${userDb.username} vient de rejoindre groupe ${grp.name}`);
}

async function createGroup(client, guildId, newGrp) {
    newGrp.guildId = guildId;
    const grpDb = await client.createGroup(newGrp);

    // stat ++
    await User.updateOne(
        { _id: newGrp.captain._id },
        { $inc: { "stats.group.created": 1 } },
    );

    // creation msg channel
    await sendMsgHubGroup(client, guildId, grpDb);

    const idListGroup = await client.getGuildChannel(guildId, SALON.LIST_GROUP);
    if (idListGroup) {
        const msgChannel = await client.channels.cache
            .get(idListGroup)
            .messages.fetch(grpDb.idMsg);

        // Création du collecteur pour les boutons
        await createCollectorGroup(client, msgChannel);
    } else {
        logger.error(`Le channel de list group n'existe pas !`);
    }
}

async function dissolveGroup(client, guildId, grp) {
    // TODO si fait par un admin
    // stat ++
    await User.updateOne(
        { _id: grp.captain._id },
        { $inc: { "stats.group.dissolved": 1 } },
    );

    // delete rappel
    deleteAllRappelJob(client, grp);

    // suppr groupe
    // TODO mettre juste un temoin suppr si l'on veut avoir une trace ? un groupHisto ?
    await client.deleteGroup(grp);

    // update msg
    await deleteMsgHubGroup(client, guildId, grp);
}

async function endGroup(client, guildId, grp) {
    // update msg
    await editMsgHubGroup(client, guildId, grp);

    // remove job
    deleteAllRappelJob(client, grp);

    // update info user
    // - XP
    // TODO faire une demande d'xp et c'est les admins qui disent "ok" ? en cas de fraude ?
    // TODO xp variable en fonction nb de personnes, autre..
    // TODO que faire si end sans qu'il y ai eu qqchose de fait ? comment vérifier ?
    const xp = BAREME_XP.EVENT_END;
    // TODO bonus captain
    const xpBonusCaptain = BAREME_XP.CAPTAIN;

    // xp pour tous les membres (captain inclus)
    for (const member of grp.members) {
        const usr = await client.users.fetch(member.userId);
        // xp bonus captain
        if (member.equals(grp.captain)) {
            addXp(client, guildId, usr, xp + xpBonusCaptain);
        } else if (usr) {
            addXp(client, guildId, usr, xp);
        }
    }

    // - MONEY
    // X = [[(Valeur du joueur de base ( 20)+ (5 par joueur supplémentaire)] X par le nombre de joueur total inscrit]] + 50 par session
    const base = 20;
    const baseJoueur = 5;
    const baseSession = 50;
    const nbSession = grp.dateEvent.length;
    const nbJoueur = grp.size;
    const prize =
        (base + baseJoueur * nbJoueur) * nbJoueur + baseSession * nbSession;

    // - Stat++ pour tous les membres
    for (const member of grp.members) {
        const usr = await client.users.fetch(member.userId);
        member.stats.group.ended++;
        member.money += prize;

        // test si achievement unlock
        const achievementUnlock = await getAchievement(member, "dmd-aide");
        if (achievementUnlock) {
            feedBotMetaAch(client, guildId, usr, achievementUnlock);
        }
        // TODO money achievement

        member.save();
    }

    // déplacer event terminé
    const idListGroup = await client.getGuildChannel(guildId, SALON.LIST_GROUP);
    if (idListGroup) {
        moveToArchive(client, idListGroup, grp.idMsg);
    } else {
        logger.error(`Le channel de list group n'existe pas !`);
    }
}

async function moveToArchive(client, idListGroup, idMsg) {
    const channel = await client.channels.cache.get(idListGroup);
    const msgChannel = await channel.messages.cache.get(idMsg);
    msgChannel.reactions.removeAll();

    // déplacement vers thread
    const archived = await channel.threads.fetchArchived();
    let thread = archived.threads.filter((x) => x.name === "Groupes terminés");

    // si pas archivé, on regarde s'il est actif
    if (thread.size === 0) {
        const active = await channel.threads.fetchActive();
        thread = active.threads.filter((x) => x.name === "Groupes terminés");
    }

    // si tjs pas actif, on le créé
    if (thread.size === 0) {
        logger.info(".. création thread archive");
        thread = await channel.threads.create({
            name: "Groupes terminés",
            //autoArchiveDuration: 60,
            reason: "Archivage des événements.",
        });

        // envoi vers thread
        await thread.send({ embeds: [msgChannel.embeds[0]] });
    } else {
        // envoi vers thread
        await thread.first().send({ embeds: [msgChannel.embeds[0]] });
    }

    // supprime msg
    await msgChannel.delete();
}

/**
 * Supprimer tous les rappels et désactive les jobs liés à ce rappel
 * @param {*} client
 * @param {*} groupe
 */
function deleteAllRappelJob(client, groupe) {
    // pour chaque date de session :
    for (const date of groupe.dateEvent) {
        deleteRappelJob(client, groupe, date);
    }
}

/**
 * Supprimer un rappel et désactive le jobs lié à ce rappel
 * @param {*} client
 * @param {*} groupe
 */
function deleteRappelJob(client, groupe, date) {
    const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    // rappel 1h et 1j avant
    const jobName1h = `rappel_1h_${groupe.name}_${date.toLocaleDateString(
        "fr-FR",
        options,
    )}`;
    const jobName1d = `rappel_1d_${groupe.name}_${date.toLocaleDateString(
        "fr-FR",
        options,
    )}`;

    // cancel ancien job si existe
    if (scheduledJobs[jobName1h]) {
        scheduledJobs[jobName1h].cancel();
    }
    if (scheduledJobs[jobName1d]) {
        scheduledJobs[jobName1d].cancel();
    }

    // si job existe -> delete
    client.findJob({ name: jobName1h }).then((jobs) => {
        if (jobs.length > 0) {
            const jobDb = jobs[0];
            logger.info(
                `-- Suppression ${jobDb.name} pour groupe ${groupe.name}..`,
            );
            client.deleteJob(jobDb);
        }
    });
    client.findJob({ name: jobName1d }).then((jobs) => {
        if (jobs.length > 0) {
            const jobDb = jobs[0];
            logger.info(
                `-- Suppression ${jobDb.name} pour groupe ${groupe.name}..`,
            );
            client.deleteJob(jobDb);
        }
    });
}

module.exports = {
    getMembersList,
    sendMsgHubGroup,
    editMsgHubGroup,
    deleteMsgHubGroup,
    createCollectorGroup,
    leaveGroup,
    joinGroup,
    createGroup,
    dissolveGroup,
    endGroup,
    moveToArchive,
    deleteAllRappelJob,
    deleteRappelJob,
    createRowGroupButtons,
};
