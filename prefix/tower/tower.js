const { GuildConfig, User } = require("../../models");
const { PermissionFlagsBits } = require("discord.js");
const {
    endSeasonForUser,
} = require("../../slash_commands/subcommands/tower/valider-jeu");

exports.run = async (client, message, args) => {
    // seulement admin / modo
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await message.reply({ content: "Pas autorisé !" });
    }
    const contentHelp = {
        content: `Utilisation : \`${process.env.PREFIX}tower start\` ou \`${process.env.PREFIX}tower stop>\``,
    };

    // args
    if (args.length === 0) {
        return await message.reply(contentHelp);
    }

    if (args.length === 1) {
        const firstParam = args[0].toLocaleLowerCase();
        if (firstParam === "start") {
            // 'start'
            const guild = await GuildConfig.findOne({
                guildId: message.guildId,
            });

            // si déjà start, on skip
            if (guild.event.tower.started) {
                return await message.reply({
                    content: "Événement déjà commencé !",
                });
            }

            logger.info(".. lancement event tower");
            guild.event.tower.started = true;
            guild.event.tower.startDate = Date.now();

            if (typeof guild.event.tower.currentSeason === "undefined") {
                guild.event.tower.currentSeason = 0;
            } else {
                guild.event.tower.currentSeason++;
            }

            await guild.save();
            return await message.reply({ content: "Événement commencé !" });
        }

        if (firstParam === "stop") {
            // 'stop'
            const guild = await GuildConfig.findOne({
                guildId: message.guildId,
            });
            // si déjà stop, on skip
            if (!guild.event.tower.started) {
                return await message.reply({
                    content: "Événement déjà arrêté !",
                });
            }

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

            // Récupérer tous les utilisateurs qui ont participé
            const season = guild.event.tower.currentSeason;
            const users = await User.find({
                "event.tower.startDate": { $exists: true },
            });

            // Sauvegarder les informations de la saison actuelle pour chaque utilisateur
            const endDate = Date.now();
            for (const user of users) {
                await endSeasonForUser(user, endDate, season);
            }
            return await message.reply({ content: "Événement arrêté !" });
        }

        return await message.reply(contentHelp);
    }

    return await message.reply({ content: "hey" });
};

exports.conf = {
    aliases: [],
};

exports.help = {
    name: "tower",
};
