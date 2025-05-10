const { EmbedBuilder } = require("discord.js");
const { createLogs } = require("../../../util/envoiMsg");
const { GuildConfig } = require("../../../models");
const { GREEN } = require("../../../data/colors.json");

const salon = async (interaction, options) => {
    const nomConfig = options.get("nom_param_salon")?.value;
    const salon = options.get("salon");
    const hook = options.get("hook")?.value;

    const guildId = interaction.guildId;
    const client = interaction.client;
    const user = interaction.user;

    let msgCustom = "";

    if (salon) {
        msgCustom = `${salon.channel} est maintenant considéré comme '${nomConfig}'`;

        await GuildConfig.updateOne(
            { guildId: guildId },
            { $set: { [`channels.${nomConfig}`]: salon.value } },
        );
        // await client.update(guildDB, { channels: val });
        logger.warn(
            `${user.tag} a effectué la commande admin : /salon ${nomConfig} ${salon.channel.name} `,
        );
        await createLogs(
            client,
            guildId,
            `Modification config ${nomConfig}`,
            `${msgCustom}`,
            "",
            GREEN,
        );
    } else if (hook) {
        msgCustom = `L'URL du Webhook ${nomConfig} a été modifié !`;

        await GuildConfig.updateOne(
            { guildId: guildId },
            { $set: { [`webhook.${nomConfig}`]: hook } },
        );

        logger.warn(
            `${user.tag} a effectué la commande admin : /salon ${nomConfig} ${hook} `,
        );
        await createLogs(
            client,
            guildId,
            `Modification config ${nomConfig}`,
            `${msgCustom}`,
            "",
            GREEN,
        );
    }

    const embed = new EmbedBuilder()
        .setColor(GREEN)
        .setDescription(`${msgCustom}`);

    return interaction.reply({ embeds: [embed], ephemeral: true });
};

exports.salon = salon;
