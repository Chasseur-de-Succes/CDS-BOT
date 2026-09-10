const { Events } = require("discord.js");
const { GuildConfigRepository } = require("../repositories");

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(msgReaction) {
        try {
            const msg = msgReaction.message;
            const emoji = msgReaction.emoji;
            const count = msgReaction.count;

            const hasPJ = msg.attachments.size > 0;

            // si piece jointes
            if (hasPJ) {
                // si image
                if (
                    msg.attachments.every((m) =>
                        m.contentType.startsWith("image"),
                    )
                ) {
                    /* HALL HEROS / ZEROS */
                    const config = await GuildConfigRepository.findByGuildId(msg.guildId);
                    const isHallHeros = msg.channelId === config.channelHeros;
                    const isHallZeros = msg.channelId === config.channelZeros;

                    // TODO si emoji special =>  meta achievement, à définir avec Sqweeb
                    if (isHallHeros) {
                    }

                    if (isHallZeros) {
                    }
                }
            }
        } catch (error) {
            logger.error(`Erreur lors ajout reaction ${error}`);
        }
    },
};
