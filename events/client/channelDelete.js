module.exports = async (client, channel) => {
    const dbGuild = await client.findGuildById(channel.guildId);
    const guildConf = await client.findGuildConfig({ whitelistChannel: channel.id });
    if(guildConf.length >= 1) {
        await client.update(dbGuild, { "$pull": {whitelistChannel: channel.id } });
        logger.warn("Channel "+channel.name+" ("+channel.id+") du serveur : "+channel.guild.name+" a été supprimé de la whitelist");
    }
}
