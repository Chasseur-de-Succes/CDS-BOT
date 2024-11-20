const { Events } = require("discord.js");
require("date.format");
const {
    loadBatch,
    loadReactionGroup,
    loadReactionMsg,
    loadVocalCreator,
} = require("../util/loader");

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`
  oooooooo8 ooooooooo    oooooooo8       oooooooooo    ooooooo   ooooooooooo 
o888     88  888    88o 888               888    888 o888   888o 88  888  88 
888          888    888  888oooooo        888oooo88  888     888     888     
888o     oo  888    888         888       888    888 888o   o888     888     
 888oooo88  o888ooo88   o88oooo888       o888ooo888    88ooo88      o888o    
    `);

        const VERSION = process.env.VERSION;
        const date = new Date();
        logger.info(
            `Logged in as ${
                client.user.tag
            }! Version: ${VERSION}. On ${date.format(
                "{MM}/{DD}/{Y} at {hh}:{mm}:{ss}",
            )}.`,
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

        logger.info("Chargement des batchs ..");
        await loadBatch(client);
        logger.info(".. terminé");

        logger.info("Chargement des messages 'events' ..");
        await loadReactionGroup(client);
        logger.info(".. terminé");

        logger.info("Chargement des reactions hall héros/zéros ..");
        await loadReactionMsg(client);
        logger.info(".. terminé");

        logger.info("Chargement du chan vocal créateur ..");
        await loadVocalCreator(client);
        logger.info(".. terminé");

        //   loadRoleGiver(client);
    },
};
