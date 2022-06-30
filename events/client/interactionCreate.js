// inspiré de https://github.com/RedSparr0w/Discord-bot-pokeclicker/blob/v13/index.js
module.exports = async (client, interaction) => {
    if (!interaction.isCommand()) return;

    // TODO autocomplete ici ?

    const command = client.slashCommands.find(cmd => cmd.help.name === interaction.commandName);

    // Not a valid command
    if (!command) return interaction.reply({ content: 'Commande non trouvée..', ephemeral: true });

    // Check si user a les droits requis
    /* if (interaction.channel.type === 'GUILD_TEXT' && interaction.channel.permissionsFor(interaction.member).missing(command.userperms).length) {
        return interaction.reply({ content: 'You do not have the required permissions to run this command.', ephemeral: true });
    } */

    // Check si le bot a les droits requis
    /* if (interaction.channel.type === 'GUILD_TEXT' && interaction.channel.permissionsFor(interaction.guild.me).missing(command.botperms).length) {
        return interaction.reply({ content: 'I do not have the required permissions to run this command.', ephemeral: true });
    } */

    // Vérification du channel comme dans messageCreate
    // TODO

    // Cooldown ?

    // lancement commande
    try {
        await command.run(interaction).catch(e => {
            throw(e);
        });
    } catch (error) {
        logger.error(`Erreur lors exécution cmd '${command.help.name}' : ${error.stack}`);
        interaction.replied ? interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de la commande !', ephemeral: true }) 
                                : interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de la commande !', ephemeral: true });
    }
}