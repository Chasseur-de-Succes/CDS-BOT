const { Group } = require("../../../models");
const { PermissionsBitField } = require("discord.js");
const { joinGroup } = require("../../../util/msg/group");

const add = async (interaction, options) => {
    const grpName = options.get("nom")?.value;
    const toAdd = options.get("membre")?.member;
    const client = interaction.client;
    const author = interaction.member;

    // fix temporaire pour n'autoriser que les admin a exécuter cette sous commande
    try {
        // si l'utilisateur n'a pas le droit admin, ca lance une erreur, je sais pas pk mais voila
        author.permissions.any(PermissionsBitField.ADMINISTRATOR);
    } catch (err) {
        return interaction.reply({
            content: `${CROSS_MARK} Tu n'as pas les droits pour effectuer cette commande`,
            ephemeral: true,
        });
    }

    const userDB = await client.getUser(toAdd);
    const grp = await Group.findOne({ name: grpName }).populate(
        "captain members game",
    );

    if (grp.members.filter((u) => u.userId === toAdd.id).length >= 1) {
        interaction.reply({
            content: `L'utilisateur ${toAdd} est déjà dans ${grpName}`,
            ephemeral: true,
        });
    } else {
        await joinGroup(client, interaction.guildId, grp, userDB);
        interaction.reply({
            content: `L'utilisateur ${toAdd} a été rajouté dans le groupe ${grpName}`,
            ephemeral: true,
        });
    }
};

exports.add = add;
