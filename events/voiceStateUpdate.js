const { ChannelType, Events } = require("discord.js");
const { GuildConfig } = require("../models");
const { names, places } = require("../data/channelNames.json");

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const guild = newState.guild;
        const member = newState.member;
        const config = await GuildConfig.findOne({ guildId: guild.id });

        // si old channeldi is null => arrive sur le channel
        // si new channeldi is null => quitte le channel
        // si old et new rempli => passe de old à new

        // si le channel vocal 'creator' est bien save dans bdd
        if (config?.channels?.create_vocal) {
            // si user arrive sur le channel 'créateur'
            if (config.channels.create_vocal === newState.channelId) {
                // ici newState est le 'creator'
                const parent = newState.channel.parent;

                // -- trouver un nom random parmis liste
                const name = getChannelName();
                logger.info(
                    `.. voice channel creator, on créé un nouveau channel ${name}`,
                );

                // -- créer un salon vocal dans même catégorie que original
                const voiceChannel = await guild.channels.create({
                    name: name,
                    type: ChannelType.GuildVoice,
                    // -- set meme parent que "creator"
                    parent: parent,
                });
                // -- le save dans config
                config.voice_channels.push(voiceChannel.id);
                await config.save();

                // -- déplacer l'utilisateur vers ce salon
                member.voice.setChannel(voiceChannel);
            }

            // si user quitte l'un des channel créé par 'creator' (newstate null)
            // ou si user passe d'un channel à un autre (old & newstate non null)
            if (
                !newState.channelId ||
                (newState.channelId && oldState.channelId)
            ) {
                // -- si plus personne dedans, on delete
                if (oldState.channel?.members.size === 0) {
                    const idxVoiceSaved = config.voice_channels.indexOf(
                        oldState.channelId.toString(),
                    );

                    if (idxVoiceSaved >= 0) {
                        logger.info(
                            ".. voice channel trouvé et vide ! on delete",
                        );
                        try {
                            // -- le supprime dans config
                            config.voice_channels.splice(idxVoiceSaved, 1);
                            await config.save();

                            // -- le supprime
                            oldState.channel
                                .delete()
                                //.then(console.log)
                                .catch(console.error);
                        } catch (err) {
                            logger.warn(
                                ".. pb avec la suppression du channel vocal !",
                            );
                            // -- le supprime en cas d'erreur avec bdd
                            oldState.channel
                                .delete()
                                //.then(console.log)
                                .catch(console.error);
                        }
                    }
                }
            }
        }
    },
};

function getChannelName() {
    const placeRandom = places[Math.floor(Math.random() * places.length)];
    const nameRandom = names[Math.floor(Math.random() * names.length)];

    return `${placeRandom} de ${nameRandom}`;
}
