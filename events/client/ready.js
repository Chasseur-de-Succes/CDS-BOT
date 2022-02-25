require('date.format');
const {VERSION} = require('../../config.js');

module.exports = client => {
    const date = new Date();
    logger.error("Logged in as "+client.user.tag+"! Version: "+VERSION+". On "+date.format("{MM}/{DD}/{Y} at {hh}:{mm}:{ss}")+".");
    //client.user.setActivity(`faire un 100% | v${VERSION}`, {type: 'PLAYING'});
    client.user.setPresence({activities: [{ name: `faire un 100% | v${VERSION}` }] });

    client.guilds.cache.map(async g => {
        const guildId = g.id;
        const dbGuild = await client.findGuildById(guildId);
        if(!dbGuild) {
            await client.createGuild({
                guildId: guildId,
            });
        }
    });
}
