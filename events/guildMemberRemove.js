const { DARK_RED } = require("../data/colors.json");
const { EmbedBuilder, Events } = require("discord.js");
const { sendLogs } = require("../util/envoiMsg");
const {
    leaveGroup,
    dissolveGroup,
    editMsgHubGroup,
} = require("../util/msg/group");

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const client = member.client;
        const guildId = member.guild.id;

        const embed = new EmbedBuilder()
            .setColor(DARK_RED)
            .setTitle(`Membre parti`)
            .setDescription(member.toString())
            .addFields(
                {
                    name: "Rejoint le",
                    value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`,
                    inline: true,
                },
                {
                    name: `Parti le `,
                    value: `<t:${Math.floor(Date.now() / 1000)}:D>`,
                    inline: true,
                },
                { name: "ID", value: `${member.id}` },
            );

        sendLogs(client, guildId, embed);

        // leave all joined groups
        const userDB = await client.getUser(member);
        const groups = await client.findGroupByUser(userDB);

        for (let group of groups) {
            if (group.captain.userId === userDB.userId) {
                if (group.members.length === 1) {
                    await dissolveGroup(client, guildId, group);
                } else {
                    let memberGrp = group.members.find((u) =>
                        u._id.equals(userDB._id),
                    );
                    let indexMember = group.members.indexOf(memberGrp);
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
