const { Collection, ChannelType } = require("discord.js");
const {
    Msg,
    MsgDmdeAide,
} = require("../models");
const {
    loadJobs,
    searchNewGamesJob,
    resetMoneyLimit,
    loadJobHelper,
    testEcuyer,
    startMonthlyClueJob,
} = require("./batch/batch");
const {
    moveToArchive,
    createRowGroupButtons,
    createCollectorGroup,
} = require("./msg/group");
const { Group } = require("../models/index");

const fs = require("node:fs");
const path = require("node:path");
const { GuildConfigRepository } = require("../repositories");

// Charge les commandes
const loadSlashCommands = (client, dir = "./slash_commands/") => {
    client.commands = new Collection();

    const commandsPath = path.join(__dirname, "../slash_commands/");
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
            logger.info(`Commande ${command.data.name} chargé`);
        } else {
            logger.warn(
                `[WARNING] Il manque "data" ou "execute" dans la commande ${filePath}.`,
            );
        }
    }
    logger.info(` --- ${commandFiles.length} commandes chargées`);
};

// Charge les événements
const loadEvents = (client) => {
    const eventsPath = path.join(__dirname, "../events");
    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        logger.info(`Événement ${event.name} chargé`);
    }
    logger.info(` --- ${eventFiles.length} événememnts chargés`);
};

// Charge les 'batch'
const loadBatch = async (client) => {
    // TODO utiliser dir comme pour les autres load ?
    await loadJobs(client);

    searchNewGamesJob(client);

    resetMoneyLimit();

    loadJobHelper(client);

    await testEcuyer(client);

    //loadSteamPICS(client);

    await startMonthlyClueJob(client);
};

// Charge les réactions des messages des groupes
const loadReactionGroup = async (client) => {
    const lMsgGrp = await MsgDmdeAide.find();

    // recupere TOUS les messages du channel de listage des groupes
    for (const msgDb of lMsgGrp) {
        const guildDb = await GuildConfigRepository.findByGuildId(msgDb.guildId);
        const idListGroup = guildDb.channelListGroup;

        if (idListGroup) {
            // recup msg sur bon channel
            client.channels.cache
                .get(idListGroup)
                .messages.fetch(msgDb.msgId)
                .then(async (msg) => {
                    const grp = await Group.findOne({ idMsg: msg.id });
                    // filtre group encore en cours
                    if (grp.validated) {
                        await moveToArchive(client, idListGroup, grp.idMsg);
                    } else {
                        // enleve réactions
                        await msg.reactions.removeAll();

                        // "maj" msg group pour ajouter boutons + collector
                        const row = await createRowGroupButtons(grp);
                        await msg.edit({ components: [row] });
                        await createCollectorGroup(client, msg);
                    }
                })
                .catch(async (err) => {
                    logger.error(
                        `Erreur load listener reaction groupes ${err}, suppression msg`,
                    );
                    // on supprime les msg qui n'existent plus
                    await Msg.deleteOne({ _id: msgDb._id });
                });
        } else {
            logger.error("- Config salon msg groupe non défini !");
        }
    }
};

const loadVocalCreator = async (client) => {
    // pour chaque guild, on check si le vocal "créer un chan vocal" est présent
    for (const guild of client.guilds.cache.values()) {
        // si le chan vocal n'existe pas, on le créé + save
        const config = await GuildConfigRepository.findByGuildId(guild.id);

        if (!config.channelCreateVocal) {
            // créer un voice channel
            // TODO parent ?
            const voiceChannel = await guild.channels.create({
                name: "🔧 Créer un salon vocal",
                type: ChannelType.GuildVoice,
            });

            // on save le salon vocal
            await GuildConfigRepository.upsert(guild.id, { channelCreateVocal: voiceChannel.id });
            logger.warn(`.. salon vocal 'créateur' créé`);
        } else {
            // s'il n'existe pas, on supprime la valeur dans la bdd
        }
    }
};

module.exports = {
    loadSlashCommands,
    loadEvents,
    loadBatch,
    loadReactionGroup,
    loadVocalCreator,
};
