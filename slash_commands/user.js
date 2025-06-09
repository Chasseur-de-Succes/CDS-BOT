const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { VERY_PALE_VIOLET } = require("../data/colors.json");
const {
    ONLINE_STATUS,
    IDLE_STATUS,
    DND_STATUS,
    OFFLINE_STATUS,
} = require("../data/emojis.json");

const bot = ["👤 Humain", "🤖 Bot"];
const status = {
    online: `${ONLINE_STATUS} En ligne`,
    idle: `${IDLE_STATUS} Absent`,
    dnd: `${DND_STATUS} Ne pas déranger`,
    offline: `${OFFLINE_STATUS} Hors ligne`,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("user")
        .setDMPermission(false)
        .setDescription("Informations sur un utilisateur")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Cet utilisateur en particulier"),
        ),
    async execute(interaction) {
        // Get user in parameter if exist, else author of the interaction
        const user = interaction.options.getUser("target") ?? interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        const nickname = member.nickname != null ? member.nickname : "Aucun";

        // Build the embed and send it
        const embed = new EmbedBuilder()
            .setColor(VERY_PALE_VIOLET)
            .setAuthor({
                name: `Informations sur ${user.tag}`,
                iconURL: user.displayAvatarURL({
                    dynamic: true,
                    size: 4096,
                    format: "png",
                }),
            })
            .setThumbnail(
                user.displayAvatarURL({
                    dynamic: true,
                    size: 4096,
                    format: "png",
                }),
            )
            .addFields(
                { name: "> Pseudonyme", value: nickname, inline: true },
                { name: "> ID", value: user.id, inline: true },
                { name: "\u200B", value: "\u200B", inline: true },
                {
                    name: "> Statut",
                    value: member.presence
                        ? status[member.presence.status]
                        : status.offline,
                    inline: true,
                },
                { name: "> Humain ?", value: bot[user.bot], inline: true },
                { name: "\u200B", value: "\u200B", inline: true },
                {
                    name: "> Compte créé le",
                    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:f>`,
                    inline: true,
                },
                {
                    name: "> À rejoint le",
                    value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:f>`,
                    inline: true,
                },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
