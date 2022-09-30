const { scheduleJob, scheduledJobs } = require("node-schedule");
const { Group, User } = require('../../models');
const { MessageEmbed } = require('discord.js');
const { DARK_RED, GREEN, YELLOW, NIGHT } = require("../../data/colors.json");
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const moment = require('moment');
const { BAREME_XP, SALON } = require("../constants");
const { addXp } = require("../xp");

/**
 * Retourne les @ des membres faisant partie du groupe, sauf le capitaine
 * @param {*} group Groupe (DB)
 * @param {*} members Collection de Members
 * @returns String, chaque @ suivi d'un saut de ligne
 */
function getMembersList(group, members) {
    const memberCaptain = members.get(group.captain.userId);
    let membersStr = ``;
    // récupère les @ des membres
    for (const member of group.members) {
        const crtMember = members.get(member.userId);
        if (crtMember !== memberCaptain)
            membersStr += `${crtMember.user}\n`;
    }
    return membersStr ? membersStr : '*Personne 😔*';
}

/**
 * Créer un message embed contenant les infos d'un group
 * @param {*} members Collection de tous les membres
 * @param {*} group Groupe (DB)
 * @param {*} isAuthorCaptain est-ce que l'auteur du msg qui a appelé cette méthode est le capitaine
 * @returns un msg embed
 */
 function createEmbedGroupInfo(members, group, isAuthorCaptain) {
    const memberCaptain = members.get(group.captain.userId);
    const membersStr = getMembersList(group, members);
    let color = '';
    if (group.validated) color = NIGHT;
    else if (group.size === 1) color = GREEN;
    else if (group.size === group.nbMax) color = DARK_RED;
    else color = YELLOW;
    
    let dateEvent = "*Non définie*";
    if (group.dateEvent) {
        dateEvent = "";
        group.dateEvent.sort((a, b) => b.getTime() - a.getTime())
            .forEach(date => {
                // moment(group.dateEvent).format("ddd Do MMM HH:mm")
                dateEvent += `- ***${moment(date).format("ddd Do MMM HH:mm")}***\n`
            })
    }
    if (!dateEvent)
        dateEvent = "*Non définie*";

    const gameAppid = group.game.appid;
    const astatLink = `[AStats](https://astats.astats.nl/astats/Steam_Game_Info.php?AppID=${gameAppid})`;
    const completionistLink = `[Completionist](https://completionist.me/steam/app/${gameAppid})`;
    const steamGuidesLink = `[Steam Guides](https://steamcommunity.com/app/${gameAppid}/guides/?browsefilter=trend&requiredtags[]=Achievements#scrollTop=0)`;
    const links = `${astatLink} | ${completionistLink} | ${steamGuidesLink}`;

    // TODO icon plutot que l'image ? -> recup via API..
    const gameUrlHeader = `https://steamcdn-a.akamaihd.net/steam/apps/${gameAppid}/header.jpg`;

    const newMsgEmbed = new MessageEmbed()
        .setTitle(`${group.validated ? '🏁' : ''}${isAuthorCaptain ? '👑' : ''} **${group.name}**`)
        .setColor(color)
        .setThumbnail(gameUrlHeader)
        .addFields(
            { name: 'Jeu', value: `${group.game.name}\n${links}`, inline: true },
            //{ name: 'Nb max joueurs', value: `${group.nbMax}`, inline: true },
            { name: 'Quand ?', value: `${dateEvent}`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },                  // 'vide' pour remplir le 3eme field et passé à la ligne
            { name: 'Capitaine', value: `${memberCaptain.user}`, inline: true },
            { name: `Membres [${group.size}/${group.nbMax}]`, value: `${membersStr}`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },                  // 'vide' pour remplir le 3eme field et passé à la ligne
        );

    if (group.desc)
        newMsgEmbed.setDescription(`*${group.desc}*`);
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
    const newMsgEmbed = createEmbedGroupInfo(members, group, false);

    // recuperation id message pour pouvoir l'editer par la suite
    const idListGroup = await client.getGuildChannel(guildId, SALON.LIST_GROUP);
    if (idListGroup) {
        let msg = await client.channels.cache.get(idListGroup).send({embeds: [newMsgEmbed]});
        await client.update(group, { idMsg: msg.id });
    
        // nvx msg aide, pour recup + facilement
        await client.createMsgDmdeAide({
            //author: userDB, // bot
            msgId: msg.id,
            guildId: msg.guildId,
        })
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
        const msg = await client.channels.cache.get(idListGroup).messages.fetch(group.idMsg);
        const editMsgEmbed = createEmbedGroupInfo(members, group, false);
        const footer = `${group.validated ? 'TERMINÉ - ' : ''}Dernière modif. ${moment().format('ddd Do MMM HH:mm')}`
        
        editMsgEmbed.setFooter({ text: `${footer}`});
    
        await msg.edit({embeds: [editMsgEmbed]});
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
        const msg = await client.channels.cache.get(idListGroup).messages.fetch(group.idMsg);
        await msg.delete();
    } else {
        logger.error(`Le channel de list group n'existe pas !`);
    }
}

/**
 * Créer un collecteur de réactions pour les messages Groupes
 * Si l'on clique sur la reaction, on s'ajoute au groupe (ssi on y est pas déjà et qu'on est pas le capitaine)
 * Sinon on se retire du groupe (sauf si on est le capitaine)
 * @param {*} client 
 * @param {*} msg le message
 * @param {*} grp le groupe provenant de la bdd
 */
 async function createReactionCollectorGroup(client, msg, grp) {
     // TODO recup grpDB a la volee ! pb lors d'un transfert
     // TOOD a revoir quand capitaine fait reaction
     const collector = await msg.createReactionCollector({ dispose: true });
     collector.on('collect', (r, u) => {
         if (!u.bot && r.emoji.name === 'check') {
             client.getUser(u)
             .then(async userDBJoined => {
                const grpDB = await Group.findOne({ _id: grp._id }).populate('captain members game');

                // si u est enregistré, non blacklisté, non capitaine, et pas déjà présent, il peut join le group
                if (userDBJoined && u.id !== grpDB.captain.userId && !userDBJoined.blacklisted && !grpDB.members.find(us => us.userId === u.id)) {
                    await joinGroup(client, msg.guildId, grpDB, userDBJoined);
                } else {
                    // send mp explication
                    let raison = 'Tu ne peux rejoindre le groupe car ';
                    if (!userDBJoined) raison += `tu n'es pas enregistré.\n:arrow_right: Enregistre toi avec la commande /register <steamid>`;
                    else if (userDBJoined.blacklisted) raison += `tu es blacklisté.`;
                    else raison += `tu es le capitaine du groupe !`;

                    // si user déjà dans event, on laisse la reaction, sinon on envoie raison
                    if (!grpDB.members.find(us => us.userId === u.id)) {
                        u.send(`${CROSS_MARK} ${raison}`);
                        r.users.remove(u.id);
                    }
                }
            });
        }
    });
    collector.on('remove', (r, u) => {
        if (!u.bot && r.emoji.name === 'check') {
            client.getUser(u)
            .then(async userDBLeaved => {
                const grpDB = await Group.findOne({ _id: grp._id }).populate('captain members game');
                // si u est capitaine, on remet? la reaction
                if (u.id !== grpDB.captain.userId && userDBLeaved) 
                    await leaveGroup(client, msg.guildId, grpDB, userDBLeaved);
            });
        }
    });
    // collector.on('end', collected => msgChannel.clearReactions());
}

/**
 * Enlève un utilisateur d'un groupe
 * @param {*} grp Le groupe
 * @param {*} userDB L'utilisateur a enlever
 */
async function leaveGroup(client, guildId, grp, userDB) {
    // update du groupe : size -1, remove de l'user dans members
    let memberGrp = grp.members.find(u => u._id.equals(userDB._id));
    var indexMember = grp.members.indexOf(memberGrp);
    grp.members.splice(indexMember, 1);
    grp.size--;
    await client.update(grp, {
        members: grp.members,
        size: grp.size,
        dateUpdated: Date.now()
    })

    // update perm channel + send message
    if (grp.channelId) {
        const guild = await client.guilds.cache.get(guildId);
        const channel = await guild.channels.cache.get(grp.channelId);
        channel.permissionOverwrites?.delete(userDB.userId, "Membre a quitté le groupe");

        // send message channel group
        channel.send(`> <@${userDB.userId}> a quitté le groupe (total : ${grp.size})`);
    }

    // stat ++
    await User.updateOne(
        { _id: userDB._id },
        { $inc: { "stats.group.left" : 1 } }
    );
    
    // update msg
    await editMsgHubGroup(client, guildId, grp);
    logger.info(userDB.username+" vient de quitter groupe "+grp.name);
}

/**
 * Ajouter un utilisateur dans un groupe
 * @param {*} grp Le groupe
 * @param {*} userDB L'utilisateur
 */
 async function joinGroup(client, guildId, grp, userDB) {
    grp.members.push(userDB);
    grp.size++;
    await client.update(grp, {
        members: grp.members,
        size: grp.size,
        dateUpdated: Date.now()
    });

    // update perm channel + send message
    if (grp.channelId) {
        const guild = await client.guilds.cache.get(guildId);
        const channel = await guild.channels.cache.get(grp.channelId);
    
        channel.permissionOverwrites.edit(userDB.userId, {
            VIEW_CHANNEL: true,
            SEND_MESSAGES: true
        });

        // send message channel group
        channel.send(`> <@${userDB.userId}> a rejoint le groupe (total : ${grp.size})`);
    }

    // stat ++
    await User.updateOne(
        { _id: userDB._id },
        { $inc: { "stats.group.joined" : 1 } }
    );

    // update msg
    await editMsgHubGroup(client, guildId, grp);
    logger.info(userDB.username+" vient de rejoindre groupe "+grp.name);
}

async function createGroup(client, guildId, newGrp) {
    newGrp.guildId = guildId;
    let grpDB = await client.createGroup(newGrp);
    
    // stat ++
    await User.updateOne(
        { _id: newGrp.captain._id },
        { $inc: { "stats.group.created" : 1 } }
    );

    // creation msg channel
    await sendMsgHubGroup(client, guildId, grpDB);
    
    const idListGroup = await client.getGuildChannel(guildId, SALON.LIST_GROUP);
    if (idListGroup) {
        const msgChannel = await client.channels.cache.get(idListGroup).messages.fetch(grpDB.idMsg);
        msgChannel.react(CHECK_MARK);

        // filtre reaction sur emoji
        await createReactionCollectorGroup(client, msgChannel, grpDB);
    } else {
        logger.error(`Le channel de list group n'existe pas !`);
    }
}

async function dissolveGroup(client, guildId, grp) {
    // TODO si fait par un admin
    // stat ++
    await User.updateOne(
        { _id: grp.captain._id },
        { $inc: { "stats.group.dissolved" : 1 } }
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
    let xp = BAREME_XP.EVENT_END;
    // TODO bonus captain
    let xpBonusCaptain = BAREME_XP.CAPTAIN;

    // xp pour tous les membres (captain inclus)
    for (const member of grp.members) {
        const usr = await client.users.fetch(member.userId);
        // xp bonus captain
        if (member.equals(grp.captain))
            addXp(usr, xp + xpBonusCaptain)
        else if (usr)
            addXp(usr, xp)
    }

    // - MONEY
    // X = [[(Valeur du joueur de base ( 20)+ (5 par joueur supplémentaire)] X par le nombre de joueur total inscrit]] + 50 par session 
    const base = 20, baseJoueur = 5, baseSession = 50;
    const nbSession = grp.dateEvent.length;
    const nbJoueur = grp.size;
    let prize = ((base + (baseJoueur * nbJoueur)) * nbJoueur) + (baseSession * nbSession);

    // - Stat++ pour tous les membres
    await User.updateMany(
        { _id: { $in: grp.members } },
        { $inc: { "stats.group.ended" : 1,
                  "money" : prize } },
        { multi: true }
    );

    // déplacer event terminé
    const idListGroup = await client.getGuildChannel(guildId, SALON.LIST_GROUP);
    if (idListGroup) {
        const channel = await client.channels.cache.get(idListGroup);
        const msgChannel = await channel.messages.cache.get(grp.idMsg);
        msgChannel.reactions.removeAll();

        // déplacement vers thread
        let archived = await channel.threads.fetchArchived();
        let thread = archived.threads.filter(x => x.name === 'Groupes terminés');

        // si pas archivé, on regarde s'il est actif
        if (thread.size === 0) {
            let active = await channel.threads.fetchActive();
            thread = active.threads.filter(x => x.name === 'Groupes terminés');
        }

        // si tjs pas actif, on le créé
        if (thread.size === 0) {
            logger.info('.. création thread archive')
            thread = await channel.threads.create({
                name: 'Groupes terminés',
                //autoArchiveDuration: 60,
                reason: 'Archivage des événements.',
            });
            
            // envoi vers thread
            await thread.send({embeds: [msgChannel.embeds[0]]});
        } else {
            // envoi vers thread
            await thread.first().send({embeds: [msgChannel.embeds[0]]});
        }
        
        // supprime msg
        await msgChannel.delete();
    } else {
        logger.error(`Le channel de list group n'existe pas !`);
    }
}

/**
 * Supprimer tous les rappels et désactive les jobs liés à ce rappel
 * @param {*} client 
 * @param {*} groupe 
 */
 function deleteAllRappelJob(client, groupe) {
    // pour chaque date de session :
    groupe.dateEvent.forEach(date => {
        deleteRappelJob(client, groupe, date)
    })
}

/**
 * Supprimer un rappel et désactive le jobs lié à ce rappel
 * @param {*} client 
 * @param {*} groupe 
 */
 function deleteRappelJob(client, groupe, date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };

    // rappel 1h et 1j avant
    const jobName1h = `rappel_1h_${groupe.name}_${date.toLocaleDateString('fr-FR', options)}`;
    const jobName1d = `rappel_1d_${groupe.name}_${date.toLocaleDateString('fr-FR', options)}`;

    // cancel ancien job si existe
    if (scheduledJobs[jobName1h])
        scheduledJobs[jobName1h].cancel();
    if (scheduledJobs[jobName1d])
        scheduledJobs[jobName1d].cancel();

    // si job existe -> delete
    client.findJob({name: jobName1h})
    .then(jobs => {
        if (jobs.length > 0) {
            let jobDB = jobs[0];
            logger.info("-- Suppression "+jobDB.name+" pour groupe "+groupe.name+"..");
            client.deleteJob(jobDB);
        }
    })
    client.findJob({name: jobName1d})
    .then(jobs => {
        if (jobs.length > 0) {
            let jobDB = jobs[0];
            logger.info("-- Suppression "+jobDB.name+" pour groupe "+groupe.name+"..");
            client.deleteJob(jobDB);
        }
    })
}

exports.getMembersList = getMembersList
exports.createEmbedGroupInfo = createEmbedGroupInfo
exports.sendMsgHubGroup = sendMsgHubGroup
exports.editMsgHubGroup = editMsgHubGroup
exports.deleteMsgHubGroup = deleteMsgHubGroup
exports.createReactionCollectorGroup = createReactionCollectorGroup
exports.leaveGroup = leaveGroup
exports.joinGroup = joinGroup
exports.createGroup = createGroup
exports.dissolveGroup = dissolveGroup
exports.endGroup = endGroup
exports.deleteAllRappelJob = deleteAllRappelJob
exports.deleteRappelJob = deleteRappelJob