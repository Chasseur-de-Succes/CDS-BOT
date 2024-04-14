const { Events } = require("discord.js");
const { MsgHallHeros, MsgHallZeros } = require("../models/index.js");
const { SALON } = require("../util/constants.js");

module.exports = {
    name: Events.MessageReactionRemove,
    async execute(msgReaction) {
        try {
            const msg = msgReaction.message;
            const emoji = msgReaction.emoji;
            const count = msgReaction.count;

            /* HALL HEROS / ZEROS */
            const idHeros = await msgReaction.client.getGuildChannel(
                msg.guildId,
                SALON.HALL_HEROS,
            );
            const idZeros = await msgReaction.client.getGuildChannel(
                msg.guildId,
                SALON.HALL_ZEROS,
            );

            const isHallHeros = msg.channelId === idHeros;
            const isHallZeros = msg.channelId === idZeros;

            const hasPJ = msg.attachments.size > 0;

            //console.log(emoji.name, count);

            // nb img dans hall héros
            // si piece jointes
            if (hasPJ) {
                // si image
                if (
                    msg.attachments.every((m) =>
                        m.contentType.startsWith("image"),
                    )
                ) {
                    // si hall heros
                    if (isHallHeros) {
                        // maj nb reactions
                        await MsgHallHeros.findOneAndUpdate(
                            { msgId: msg.id },
                            {
                                $set: {
                                    [`reactions.${emoji.name}`]: count,
                                },
                            },
                        );
                    }

                    // si hall zeros
                    if (isHallZeros) {
                        // maj nb reactions
                        await MsgHallZeros.findOneAndUpdate(
                            { msgId: msg.id },
                            {
                                $set: {
                                    [`reactions.${emoji.name}`]: count,
                                },
                            },
                        );
                    }
                }
            }
        } catch (error) {
            logger.error(`Erreur lors remove reaction ${error}`);
        }
    },
};
