
async function loadCollectorHall(msg, msgDB) {
    // creer collector
    const collector = await msg.createReactionCollector({ dispose: true });
    collector.on('collect', async (r, u) => {
        if (!u.bot) {
            msgDB.reactions.set(r.emoji.name, r.count)
            await msgDB.save();
        }
    });
    collector.on('remove', async (r, u) => {
        if (!u.bot) {
            msgDB.reactions.set(r.emoji.name, r.count)
            await msgDB.save();
        }
    });
}

exports.loadCollectorHall = loadCollectorHall