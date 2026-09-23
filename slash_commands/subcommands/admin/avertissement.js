const { EmbedBuilder } = require("discord.js");
const { createLogs, createError } = require("../../../util/envoiMsg");
const { GREEN, ORANGE, CRIMSON } = require("../../../data/colors.json");
const { leaveGroup, dissolveGroup } = require("../../../util/msg/group");
const { UserRepository, GroupRepository } = require("../../../repositories");

const avertissement = async (interaction, options) => {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const user = options.getUser("target");
    const nb = interaction.options.getInteger("nb");
    const raison = interaction.options.getString("raison");
    const member = await interaction.guild.members.fetch(user.id);

    const userDb = await UserRepository.findByDiscordId(user.id);
    if (!userDb) {
        // Si pas dans la BDD
        return interaction.reply({
            embeds: [
                createError(`${user.tag} n'a pas encore de compte !`),
            ],
        });
    }

    // si nb defini, on set
    if (nb || nb === 0) {
        userDb.nbWarning = nb;
    } else {
        // sinon on incremente
        userDb.nbWarning++;
    }

    let color = "";
    let title = "";
    let desc = "";

    // on ignore si déja 3 warning
    if (userDb.nbWarning <= 3) {
        title = `${userDb.nbWarning} ${
            userDb.nbWarning === 1 ? "avertissement" : "avertissements"
        } !`;

        if (userDb.nbWarning === 3) {
            color = CRIMSON;
            desc = `${user} est maintenant **interdit** d'event ! 🔨`;
        } else if (userDb.nbWarning === 0) {
            color = GREEN;
            desc = `${user} est maintenant clean ! 👼`;
        } else {
            color = ORANGE;
            desc = `Encore **${3 - userDb.nbWarning}** ${
                3 - userDb.nbWarning === 1 ? "avertissement" : "avertissements"
            } et ${user} est puni ! 😈`;
        }
    } else {
        color = CRIMSON;
        title = `${userDb.nbWarning} avertissements !`;
        desc = `${user} est déjà interdit d'event (depuis 3 avertissements déjà) ! 🔨
                    Ca fait beaucoup là non ?`;
    }

    if (raison) {
        desc += `
            **Raison avertissement :** 
            *${raison}*
            `;
    }

    // rôle 404
    const role404 = interaction.guild.roles.cache.find(
        (r) => r.name === "Erreur 404",
    );
    if (role404) {
        // si warning == 3 => on donne le role
        // sinon, si <= 2 on l'enleve (si a le role)
        if (userDb.nbWarning === 3) {
            member.roles.add(role404);
            // - l'enlever de tous les groupes
            const groupes = await GroupRepository.findGroupByUser(userDb.id);

            for (const groupe of groupes) {
                // si capitaine
                if (groupe.captainUser.id === userDb.id) {
                    // si groupes a encore des membres
                    if (groupe.size > 1) {
                        await leaveGroup(client, guildId, groupe, userDb);

                        logger.info(
                            ` - ${groupe.members[0].username} est nouveau capitaine pour groupe ${groupe.name}`,
                        );
                        groupe.captain = groupe.members[0].id;
                        await GroupRepository.update(groupe.id, { captain: groupe.captain });

                        // - notif groupe
                        if (groupe.channelId) {
                            const channel =
                                await interaction.guild.channels.cache.get(
                                    groupe.channelId,
                                );

                            // send message channel group
                            channel.send(
                                `> 👑 <@${groupe.captain.userId}> est le nouveau capitaine !`,
                            );
                        }
                    } else {
                        logger.info(
                            ` - plus personne dans groupe ${groupe.name} .. on dissout`,
                        );
                        await dissolveGroup(client, guildId, groupe);

                        // suppression channel discussion
                        if (groupe.channelId) {
                            interaction.guild.channels.cache
                                .get(groupe.channelId)
                                ?.delete("Groupe supprimé");
                        }
                    }
                } else {
                    logger.info(
                        ` - ${userDb.username} est kick du groupe ${groupe.name}`,
                    );
                    // - notif groupe
                    if (groupe.channelId) {
                        const channel =
                            await interaction.guild.channels.cache.get(
                                groupe.channelId,
                            );

                        // send message channel group
                        channel.send(`> <@${userDb.userId}> a été kick.`);
                    }
                    await leaveGroup(client, guildId, groupe, userDb);
                }
            }

            // envoyer DM pour prevenir
            const mp = new EmbedBuilder()
                .setColor(color)
                .setTitle("⚠️ Tu as reçu **3 avertissements** ⚠️")
                .setDescription(`${
                    raison ? `Pour la raison : \n*${raison}*` : ""
                }
                                                     Tu es **"puni"** temporairement :
                                                     ▶️ Tu as été **ejecté** de tous tes groupes
                                                     ▶️ Tu ne peux **plus rejoindre** un groupe
                                                     
                                                     Si cela est une erreur, n'hésite pas à contacter un administrateur.`);
            user.send({ embeds: [mp] });
        } else if (userDb.nbWarning <= 2) {
            // eneleve le role
            member.roles.remove(role404);

            // envoi mp
            let titleMp = "";
            let descMp = "";

            if (userDb.nbWarning === 0) {
                titleMp = "👼 Tu n'es plus **puni** 👼";
                descMp = `${raison ? `Pour la raison : \n*${raison}*` : ""}
                             ▶️ Tu peux de nouveau rejoindre un groupe`;
            } else if (userDb === 1) {
                titleMp = `⚠️ **${userDb.nbWarning}er avertissement** ⚠️`;
                descMp = `${raison ? `Pour la raison : \n*${raison}*` : ""}
                             ▶️ Au 3ème, tu ne pourras plus rejoindre de groupe.`;
            } else {
                titleMp = `⚠️ **${userDb.nbWarning}ème avertissement** ⚠️`;
                descMp = `${raison ? `Pour la raison : \n*${raison}*` : ""}
                             ▶️ Au 3ème, tu ne pourras plus rejoindre de groupe.`;
            }

            const mp = new EmbedBuilder()
                .setColor(color)
                .setTitle(titleMp)
                .setDescription(descMp);
            user.send({ embeds: [mp] });
        }
    } else {
        logger.info(
            `.. role Erreur 404 pas encore créé pour ${interaction.guild.name}`,
        );
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(desc);

    await UserRepository.update(userDb.id, { nbWarning: userDb.nbWarning });

    await createLogs(
        client,
        guildId,
        `⚠️ ${title}`,
        desc,
        `par ${interaction.member.user.tag}`,
        color,
    );
    return interaction.reply({ embeds: [embed], ephemeral: true });
};

exports.avertissement = avertissement;
