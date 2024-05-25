const {
    EmbedBuilder,
    SlashCommandBuilder,
    PermissionFlagsBits,
} = require("discord.js");
const { GREEN, ORANGE, CRIMSON } = require("../data/colors.json");
const { createError, createLogs } = require("../util/envoiMsg");
const { leaveGroup, dissolveGroup } = require("../util/msg/group");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avertissement")
        .setDescription("Donne ou enleve un avertissement")
        .setDMPermission(false)
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Sur cet utilisateur en particulier")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("raison")
                .setDescription("Raison de l'avertissement"),
        )
        .addIntegerOption((option) =>
            option
                .setName("nb")
                .setDescription("Nombre d'avertissement (entre 0 et 3)")
                .setMinValue(0)
                .setMaxValue(3),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const client = interaction.client;
        const guildId = interaction.guildId;
        const user = interaction.options.getUser("target");
        const nb = interaction.options.getInteger("nb");
        const raison = interaction.options.getString("raison");
        const member = interaction.guild.members.cache.get(user.id);

        const dbUser = await client.getUser(member);
        if (!dbUser) {
            // Si pas dans la BDD
            return interaction.reply({
                embeds: [
                    createError(
                        `${member.user.tag} n'a pas encore de compte !`,
                    ),
                ],
            });
        }

        // si nb defini, on set
        if (nb || nb === 0) {
            dbUser.warning = nb;
        } else {
            // sinon on incremente
            dbUser.warning++;
        }

        let color = "";
        let title = "";
        let desc = "";

        // on ignore si déja 3 warning
        if (dbUser.warning <= 3) {
            title = `${dbUser.warning} ${
                dbUser.warning === 1 ? "avertissement" : "avertissements"
            } !`;

            if (dbUser.warning === 3) {
                color = CRIMSON;
                desc = `${user} est maintenant **interdit** d'event ! 🔨`;
            } else if (dbUser.warning === 0) {
                color = GREEN;
                desc = `${user} est maintenant clean ! 👼`;
            } else {
                color = ORANGE;
                desc = `Encore **${3 - dbUser.warning}** ${
                    3 - dbUser.warning === 1
                        ? "avertissement"
                        : "avertissements"
                } et ${user} est puni ! 😈`;
            }
        } else {
            color = CRIMSON;
            title = `${dbUser.warning} avertissements !`;
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
            if (dbUser.warning === 3) {
                member.roles.add(role404);
                // - l'enlever de tous les groupes
                const groupes = await client.findGroup({
                    $and: [{ members: dbUser._id }, { validated: false }],
                });

                for (const groupe of groupes) {
                    // si capitaine
                    if (groupe.captain._id.equals(dbUser._id)) {
                        // si groupes a encore des membres
                        if (groupe.size > 1) {
                            await leaveGroup(client, guildId, groupe, dbUser);

                            logger.info(
                                ` - ${groupe.members[0].username} est nouveau capitaine pour groupe ${groupe.name}`,
                            );
                            groupe.captain = groupe.members[0];
                            await groupe.save();

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
                            ` - ${dbUser.username} est kick du groupe ${groupe.name}`,
                        );
                        // - notif groupe
                        if (groupe.channelId) {
                            const channel =
                                await interaction.guild.channels.cache.get(
                                    groupe.channelId,
                                );

                            // send message channel group
                            channel.send(`> <@${dbUser.userId}> a été kick.`);
                        }
                        await leaveGroup(client, guildId, groupe, dbUser);
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
            } else if (dbUser.warning <= 2) {
                // eneleve le role
                member.roles.remove(role404);

                // envoi mp
                let titleMp = "";
                let descMp = "";

                if (dbUser.warning === 0) {
                    titleMp = "👼 Tu n'es plus **puni** 👼";
                    descMp = `${raison ? `Pour la raison : \n*${raison}*` : ""}
                             ▶️ Tu peux de nouveau rejoindre un groupe`;
                } else if (dbUser === 1) {
                    titleMp = "⚠️ **${dbUser.warning}er avertissement** ⚠️";
                    descMp = `${raison ? `Pour la raison : \n*${raison}*` : ""}
                             ▶️ Au 3ème, tu ne pourras plus rejoindre de groupe.`;
                } else {
                    titleMp = "⚠️ **${dbUser.warning}ème avertissement** ⚠️";
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

        await dbUser.save();

        await createLogs(
            client,
            guildId,
            `⚠️ ${title}`,
            desc,
            `par ${interaction.member.user.tag}`,
            color,
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
