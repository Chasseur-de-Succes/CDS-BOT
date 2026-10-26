const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
require("dotenv").config();

// logger for the bot and cosole for the script deploy-command
async function reloadCommands(commandsPath, logger = null) {
    // Grab all the command files from the commands directory you created earlier
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

    const commands = [];

    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if (!command.data) {
            if (logger)
                logger.warn(`Error: command ${file} is missing 'data'.`);
            else console.warn(`Error: command ${file} is missing 'data'.`);
            continue;
        }

        commands.push(command.data.toJSON());
    }

    // Construct and prepare an instance of the REST module
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    // DELETE COMMANDS - uncommented if necessary
    // for guild-based commands
    // rest.put(Routes.applicationGuildCommands(process.env.CLIENTID, '...'), { body: [] })
    // 	 .then(() => console.log('Successfully deleted all guild commands.'))
    // 	 .catch(console.error);

    // for global commands
    // rest.put(Routes.applicationCommands(process.env.CLIENTID), { body: [] })
    // 	.then(() => console.log('Successfully deleted all application commands.'))
    // 	.catch(console.error);

    // and deploy your commands!
    try {
        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENTID),
            { body: commands },
        );

        const msg = `✅ Successfully reloaded ${data.length} commands.`;
        if (logger) logger.info(msg);
        else console.log(msg);

        return { success: true, count: data.length };
    } catch (error) {
        const err = `❌ Erreur: ${error.message}`;
        if (logger) logger.error(err);
        else console.error(err);
        throw error;
    }
}

module.exports = { reloadCommands };
