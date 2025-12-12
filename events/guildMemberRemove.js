const { DARK_RED } = require("../data/colors.json");
const { EmbedBuilder, Events } = require("discord.js");
const { sendLogs } = require("../util/envoiMsg");
const {
    leaveGroup,
    dissolveGroup,
    editMsgHubGroup,
} = require("../util/msg/group");
const { discordTimestamp } = require("../util/discordFormatters");

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
            const msgLeave = `😢 ${member.user} a quitté le serveur. Bonne continuation à toi !`;
            await member.client.channels.cache
                .get(systemChannel.id)
                .send(msgLeave);
        }

        // leave all joined groups
        const userDB = await client.getUser(member);
        const groups = await client.findGroupByUser(userDB);

        for (const group of groups) {
            if (group.captain.userId === userDB.userId) {
                if (group.members.length === 1) {
                    await dissolveGroup(client, guildId, group);
                } else {
                    const memberGrp = group.members.find((u) =>
                        u._id.equals(userDB._id),
                    );
                    const indexMember = group.members.indexOf(memberGrp);
                    group.members.splice(indexMember, 1);
                    group.size--;
                    const newCaptainDB = group.members[0];
                    const newCaptain = member.guild.members.cache.get(
                        newCaptainDB.userId,
                    );
                    group.captain = newCaptainDB;
                    await client.update(group, {
                        captain: group.captain,
                        members: group.members,
                        size: group.size,
                        dateUpdated: Date.now(),
                    });

                    // update msg
                    await editMsgHubGroup(client, guildId, group);

                    logger.info(
                        `${member.user.tag} a quitté le serveur, ${newCaptain.user.tag} est le nouveau capitaine du groupe : ${group.name}`,
                    );
                    const newMsgEmbed = new EmbedBuilder().setDescription(
                        `${member.user.tag} a quitté le serveur, ${newCaptain.user.tag} est le nouveau capitaine du groupe ! (membres dans le groupe : ${group.size})`,
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
