const { PermissionFlagsBits } = require("discord.js");
const { joinGroup } = require("../../../../util/msg/group");
const { CROSS_MARK } = require("../../../../data/emojis.json");
const { UserRepository, GroupRepository } = require("../../../../repositories");

const add = async (interaction, options) => {
    const idGrp = options.get("nom_group")?.value;
    const toAdd = options.get("membre")?.member;
    const client = interaction.client;
    const author = interaction.member;

    const isAdmin = author.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
        return interaction.reply({
            content: `${CROSS_MARK} Tu n'as pas les droits pour effectuer cette commande`,
            ephemeral: true,
        });
    }

    const userDb = await UserRepository.findByDiscordId(toAdd.id);
    const grp = await GroupRepository.findByIdWithRelations(idGrp);

    if (userDb === undefined) {
        interaction.reply({
            content: `L'utilisateur ${toAdd} ne s'est pas enregistré.`,
            ephemeral: true,
        });
    } else if (grp.members.find((us) => us.discordId === userDb.discordId)) {
        interaction.reply({
            content: `L'utilisateur ${toAdd} est déjà dans ${grp.name}`,
            ephemeral: true,
        });
    } else {
        await joinGroup(client, interaction.guildId, grp, userDb);
        interaction.reply({
            content: `L'utilisateur ${toAdd} a été rajouté dans le groupe ${grp.name}`,
            ephemeral: true,
        });
    }
};

exports.add = add;
