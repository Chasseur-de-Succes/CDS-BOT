const { GREEN } = require("../../data/colors.json");
const { createError } = require("../../util/envoiMsg");
const { loadRoleGiver } = require("../../util/loader");
const { Permissions, SlashCommandBuilder } = require("discord.js");
const { RolesChannel } = require("../../models");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("role")
        .setDescription("Commande pour modifier un rôle"),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "create") {
            createRole(interaction, interaction.options);
        } else if (subcommand === "delete") {
            deleteRole(interaction, interaction.options);
        }
    },
};

const regexEmoji =
    /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu;
const createRole = async (interaction, options) => {
    const nomRole = options.get("nom")?.value;
    const emoji = options.get("emoji")?.value;
    const client = interaction.client;
    const guild = interaction.guild;
    const author = interaction.member;

    // tester emoji
    if (!emoji.match(/(<a?)?:\w+:(\d{18}>)?/) && !emoji.match(regexEmoji))
        return interaction.reply({
            embeds: [createError(`${emoji} n'est pas un emoji reconnu !`)],
        });

    // tester si emoji n'est pas déjà utilisé
    const rolesExist = await RolesChannel.findOne({ emoji: emoji });
    if (rolesExist)
        return interaction.reply({
            embeds: [createError(`${emoji} est déjà utilisé !`)],
        });

    // créer un role "default"
    const role = await guild.roles.create({
        name: nomRole,
        permissions: [Permissions.DEFAULT],
    });

    // créer un text channel lié à ce rôle
    const channel = await guild.channels.create(nomRole, {
        type: "text",
        permissionOverwrites: [
            {
                id: role.id,
                allow: ["VIEW_CHANNEL"],
            },
            {
                id: guild.roles.everyone.id,
                deny: ["VIEW_CHANNEL"],
            },
        ],
    });

    // save en base
    const roleDB = {
        roleID: role.id,
        channelID: channel.id,
        name: nomRole,
        emoji: emoji,
    };
    client.createRoleChannel(roleDB);

    loadRoleGiver(client, true);

    // log
    createLogs(
        client,
        interaction.guildId,
        `Création`,
        `Nouveau rôle ${role} & channel ${channel}, réalisé par ${author}`,
        "",
        GREEN,
    );

    return interaction.reply(
        `Création du channel ${channel} pour ceux ayant le rôle ${role}`,
    );
};

const deleteRole = async (interaction, options) => {
    const role = options.get("role")?.value;
    const client = interaction.client;
    const guild = interaction.guild;
    const author = interaction.member;

    // tester si role est présent en base
    const rolesExist = await RolesChannel.findOne({ roleID: role });
    if (!rolesExist)
        return interaction.reply({
            embeds: [
                createError(
                    `Ce rôle ne peux être supprimé car non créé via commande !`,
                ),
            ],
        });

    // suppression channel
    const channel = await guild.channels.fetch(rolesExist.channelID);
    await channel.delete(`Le salon n'est plus utilisé`);
    /* .then(channel => channel.delete(`Le salon n'est plus utilisé`))
    .catch(err => logger.warn(`Le channel ${rolesExist.channelID} est déjà supprimé : ${err}`)) */

    // suppression role
    const roleGuild = await guild.roles.fetch(rolesExist.roleID);
    if (roleGuild) await roleGuild.delete(`Le rôle n'est plus utilisé`);
    else logger.warn(`Le rôle n'existe plus ?`);

    // suppression dans BDD
    await RolesChannel.deleteOne({ roleID: role });

    // reload msg role + enlever emoji qui n'existe plus
    loadRoleGiver(client, true, rolesExist.emoji);

    // log
    createLogs(
        client,
        interaction.guildId,
        `Suppression`,
        `Rôle ${roleGuild.name} & channel ${channel.name} supprimé, réalisé par ${author}`,
        "",
        GREEN,
    );

    return interaction.reply(
        `Suppression du channel ${channel.name} et le rôle ${roleGuild.name} associé !`,
    );
};
