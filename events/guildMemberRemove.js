const { DARK_RED } = require("../data/colors.json");
const { EmbedBuilder, Events } = require("discord.js");
const { sendLogs } = require("../util/envoiMsg");
const {
    leaveGroup,
    dissolveGroup,
    editMsgHubGroup,
} = require("../util/msg/group");
const { discordTimestamp } = require("../util/discordFormatters");
const { UserRepository, GroupRepository } = require("../repositories");

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const client = member.client;
        const guildId = member.guild.id;

        const embed = new EmbedBuilder()
            .setColor(DARK_RED)
            .setTitle("Membre parti")
            .setDescription(member.toString())
            .addFields(
                {
                    name: "Rejoint le",
                    value: `${discordTimestamp(member.joinedTimestamp, "D")}`,
                    inline: true,
                },
                {
                    name: "Parti le ",
                    value: `${discordTimestamp(Date.now(), "D")}`,
                    inline: true,
                },
                { name: "ID", value: `${member.id}` },
            );

        sendLogs(client, guildId, embed);

        const systemChannel = member.guild.systemChannel;
        if (systemChannel) {
            const msgLeave = `😢 ${member.user} (${member.user.tag}) a quitté le serveur. Bonne continuation à toi !`;
            await member.client.channels.cache
                .get(systemChannel.id)
                .send(msgLeave);
        }

        // leave all joined groups
        const userDB = await UserRepository.findByDiscordUser(member.user);
        const groups = await GroupRepository.findGroupByUser(userDB.id);
        for (const group of groups) {
            if (group.captainUser.id === userDB.id) {
                if (group.members.length === 1) {
                    await dissolveGroup(client, guildId, group);
                } else {
                    await GroupRepository.removeMember(group.id, userDB.id);

                    const memberGrp = group.members.find((u) => u.id === userDB.id);
                    const indexMember = group.members.indexOf(memberGrp);
                    group.members.splice(indexMember, 1);

                    const newCaptainDB = group.members[0];
                    const newCaptain = member.guild.members.cache.get(
                        newCaptainDB.discordId,
                    );

                    await GroupRepository.update(group.id, {
                        captain: newCaptainDB.id,
                        members: group.members,
                        dateUpdated: new Date(),
                    });

                    // update msg
                    await editMsgHubGroup(client, guildId, group);

                    logger.info(
                        `${member.user.tag} a quitté le serveur, ${newCaptain.user.tag} est le nouveau capitaine du groupe : ${group.name}`,
                    );
                    const newMsgEmbed = new EmbedBuilder().setDescription(
                        `${member.user.tag} a quitté le serveur, ${newCaptain.user.tag} est le nouveau capitaine du groupe ! (membres dans le groupe : ${group.members.length})`,
                    );
                    const channelGroup = await client.channels.cache.get(
                        group.channelId,
                    );
                    await channelGroup.send({ embeds: [newMsgEmbed] });
                }
            } else {
                await leaveGroup(client, guildId, group, userDB);
            }
        }
    },
};
