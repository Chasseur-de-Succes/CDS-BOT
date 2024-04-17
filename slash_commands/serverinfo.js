const { NIGHT } = require("../data/colors.json");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    TimestampStyles,
    time,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDMPermission(false)
        .setDescription("Informations sur le serveur"),
    async execute(interaction) {
        // Getting the owner of the server
        const owner = await interaction.client.users.fetch(
            interaction.guild.ownerId,
        );

        // For each members of the server, check if it's a bot or a human to avoid having two filters
        const membersCount = { humans: 0, bots: 0 };

        for (const m of interaction.guild.members.cache.values()) {
            if (m.user.bot) {
                membersCount.bots += 1;
            } else {
                membersCount.humans += 1;
            }
        }

        // Build the embed and send it
        const embed = new EmbedBuilder()
            .setColor(NIGHT)
            .setTitle(interaction.guild.name)
            .setDescription(`ID: ${interaction.guild.id}`)
            .setThumbnail(interaction.guild.iconURL())
            .addFields(
                {
                    name: "Propriétaire du server",
                    value: ` ${owner.username} (ID: ${interaction.guild.ownerId})`,
                    inline: false,
                },
                {
                    name: `Membres [${interaction.guild.memberCount}]`,
                    value: `${membersCount.humans} humains\n${membersCount.bots} bots`,
                    inline: true,
                },
                {
                    name: "Nitro boost ",
                    value: interaction.guild.premiumSubscriptionCount.toString(),
                    inline: true,
                },
                {
                    name: "Serveur créé le",
                    value: time(
                        interaction.guild.createdTimestamp,
                        TimestampStyles.ShortDateTime,
                    ),
                    inline: false,
                },
            )
            .setTimestamp(new Date())
            .setFooter({ text: `Demandé par ${interaction.user.username}` });

        await interaction.reply({ embeds: [embed] });
    },
};
