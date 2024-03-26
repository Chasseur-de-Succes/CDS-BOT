const { Events } = require("discord.js");
require("date.format");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        const VERSION = process.env.VERSION;
        const date = new Date();
        logger.info(
            "Logged in as " +
                client.user.tag +
                "! Version: " +
                VERSION +
                ". On " +
                date.format("{MM}/{DD}/{Y} at {hh}:{mm}:{ss}") +
                ".",
        );

        client.user.setPresence({
            activities: [{ name: `faire un 100% | v${VERSION}` }],
        });

        client.guilds.cache.map(async (g) => {
            const guildId = g.id;
            const dbGuild = await client.findGuildById(guildId);
            if (!dbGuild) {
                await client.createGuild({
                    guildId: guildId,
                });
            }
        });
    },
};
