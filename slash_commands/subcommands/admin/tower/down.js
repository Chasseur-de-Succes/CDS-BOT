const { GuildConfig } = require("../../../../models");
const { createError } = require("../../../../util/envoiMsg");

async function down(interaction, options) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const author = interaction.member;

    // récup l'utilisateur et test si register
    const user = options.getUser("user");
    const userDb = await client.getUser(user);
    if (!userDb) {
        // Si pas dans la BDD
        return interaction.reply({
            embeds: [
                createError(
                    `${user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                ),
            ],
        });
    }

    // si déjà stop, on skip
    const guild = await GuildConfig.findOne({ guildId: guildId });
    if (!guild.event.tower.started) {
        return await interaction.reply({
            content: "Événement déjà arrêté !",
        });
    }

    // si l'user n'est pas inscrit, on skip
    if (!userDb.event.tower.startDate) {
        return await interaction.reply({
            content: "L'utilisateur n'est pas inscrit à l'événement !",
        });
    }

    // on enlève un étage à l'utilisateur
    if (userDb.event.tower.etage > 0) {
        logger.info(`${author.user.tag} a enlevé **1** étage à ${user.tag} ..`);
        userDb.event.tower.etage -= 1;
        await userDb.save();
        return await interaction.reply({
            content: `${user.tag} a bien descendu d'un étage !`,
        });
    }

    return await interaction.reply({
        content: `${user.tag} est déjà au rez-de-chaussée.`,
    });
}

exports.down = down;
