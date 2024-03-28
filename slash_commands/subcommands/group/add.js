const { Group } = require("../../../models");
const { PermissionsBitField } = require("discord.js");
const { joinGroup } = require("../../../util/msg/group");
const { CROSS_MARK } = require("../../../data/emojis.json");

const add = async (interaction, options) => {
    const grpName = options.get("nom")?.value;
    const toAdd = options.get("membre")?.member;
    const client = interaction.client;
    const author = interaction.member;

    // fix temporaire pour n'autoriser que les admins à exécuter cette sous commande
    try {
        // si l'utilisateur n'a pas le droit admin, ça lance une erreur, je ne sais pas pourquoi mais voila
        author.permissions.any(PermissionsBitField.ADMINISTRATOR);
    } catch (err) {
        return interaction.reply({
            content: `${CROSS_MARK} Tu n'as pas les droits pour effectuer cette commande`,
            ephemeral: true,
        });
    }

    const userDb = await client.getUser(toAdd);
    const grp = await Group.findOne({ name: grpName }).populate(
        "captain members game",
    );

    if (grp.members.filter((u) => u.userId === toAdd.id).length >= 1) {
        interaction.reply({
            content: `L'utilisateur ${toAdd} est déjà dans ${grpName}`,
            ephemeral: true,
        });
    } else {
        await joinGroup(client, interaction.guildId, grp, userDb);
        interaction.reply({
            content: `L'utilisateur ${toAdd} a été rajouté dans le groupe ${grpName}`,
            ephemeral: true,
        });
    }
};

exports.add = add;
