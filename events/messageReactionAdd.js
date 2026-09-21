const { Events } = require("discord.js");
const { GuildConfigRepository } = require("../repositories");
const { NEW_SALON } = require("../util/constants");

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
                    const channelHeros = await GuildConfigRepository.getChannel(msg.guildId, NEW_SALON.HALL_HEROS);
                    const channelZeros = await GuildConfigRepository.getChannel(msg.guildId, NEW_SALON.HALL_ZEROS);
                    const isHallHeros = msg.channelId === channelHeros;
                    const isHallZeros = msg.channelId === channelZeros;

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
