const { version, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { GREEN } = require("../data/colors.json");
const { discordTimestamp } = require("../util/discordFormatters");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDMPermission(false)
        .setDescription("Informations sur le bot"),

    async execute(interaction) {
        const client = interaction.client;
        const botIcon = client.user.displayAvatarURL();
        const VERSION = process.env.VERSION;

        let developers = "";
        for (const devId of process.env.DEVELOPERS.split(",")) {
            const dev = client.users.cache.get(devId);
            if (dev) developers += `- ${dev.tag}\n`;
        }

        const timeUp = client.uptime;
        const createdTimestamp = discordTimestamp(
            client.user.createdTimestamp,
            "f",
        );
        const embedInfo = new EmbedBuilder()
            .setColor(GREEN)
            .setTitle(client.user.username)
            .setDescription(`La version actuelle est ${VERSION}`)
            .setThumbnail(botIcon)
            .addFields(
                { name: "Développeurs", value: developers },
                {
                    name: "Créé le",
                    value: `${createdTimestamp}`,
                },
                { name: "Langage", value: "JavaScript", inline: true },
                { name: "Library", value: "discord.js", inline: true },
                { name: "Discord.js", value: `v${version}`, inline: true },
                {
                    name: "Uptime",
                    value:
                        `${Math.round(timeUp / (1000 * 60 * 60 * 24))} days, ` +
                        `${
                            Math.round(timeUp / (1000 * 60 * 60)) % 24
                        } hours, ` +
                        `${Math.round(timeUp / (1000 * 60)) % 60} mins and ` +
                        `${Math.round(timeUp / 1000) % 60} secs`,
                },
            )
            .setFooter({ text: `Demandé par ${interaction.user.username}` });

        return interaction.reply({ embeds: [embedInfo] });
    },
};
