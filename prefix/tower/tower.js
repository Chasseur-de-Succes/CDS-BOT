const {GuildConfig} = require("../../models");
const {PermissionFlagsBits} = require("discord.js");
exports.run = async (client, message, args) => {
    // seulement admin / modo
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await message.reply({ content: 'Pas autorisé !' });
    }
    const contentHelp = { content: `Utilisation : \`${process.env.PREFIX}tower start\` ou \`${process.env.PREFIX}tower stop>\`` };

    // args
    if (args.length === 0) {
        return await message.reply(contentHelp);
    } else if (args.length === 1) {
        const firstParam = args[0].toLocaleLowerCase();
        if (firstParam === 'start') {
            // 'start'
            const guild = await GuildConfig.findOne({ guildId: message.guildId });

            // si déjà start, on skip
            if (guild.event.tower.started) {
                return await message.reply({ content: "Événement déjà commencé !"})
            } else {
                logger.info(".. lancement event tower");
                guild.event.tower.started = true;
                guild.event.tower.startDate = Date.now();

                if (typeof guild.event.tower.currentSeason === 'undefined') {
                    guild.event.tower.currentSeason = 0;
                } else {
                    guild.event.tower.currentSeason++;
                }

                await guild.save();
                return await message.reply({ content: "Événement commencé !"})
            }
        } else if (firstParam === 'stop') {
            // 'stop'
            const guild = await GuildConfig.findOne({ guildId: message.guildId });
            // si déjà stop, on skip
            if (!guild.event.tower.started) {
                return await message.reply({ content: "Événement déjà arrêté !"})
            } else {
                logger.info(".. arrêt event tower");
                // on a terminé manuellement, donc l'événément ne s'est pas terminé de lui-même
                guild.event.tower.started = false;
                // on garde une trace
                guild.event.tower.history.push({
                    season: guild.event.tower.currentSeason,
                    startDate: guild.event.tower.startDate,
                    endDate: Date.now(),
                    finished: false,
                });

                await guild.save();
                return await message.reply({ content: "Événement arrêté !"})
            }
        } else {
            return await message.reply(contentHelp);
        }
    }

    return await message.reply({ content: "hey" });
};

exports.conf = {
    aliases: [],
};

exports.help = {
    name: "tower",
};
