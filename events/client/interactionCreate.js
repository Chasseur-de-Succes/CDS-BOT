// inspiré de https://github.com/RedSparr0w/Discord-bot-pokeclicker/blob/v13/index.js
module.exports = async (client, interaction) => {
    
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            // TODO Embed error
            // TODO editReply ou reply..
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    } else if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
    }
    // ----
    if (!interaction.isCommand()) return;

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