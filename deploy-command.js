const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
require("dotenv").config();

// recup config
process.env.cli;

const globalCommands = [];
const guildCommands = [];
// Grab all the command files from the commands directory you created earlier
const commandFiles = fs
    .readdirSync("./slash_commands/")
    .filter((file) => file.endsWith(".js"));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
    const command = require(`./slash_commands/${file}`);

    if (!command.data) continue;

    if (command.devOnly) {
        guildCommands.push(command.data.toJSON());
    } else {
        globalCommands.push(command.data.toJSON());
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// for guild-based commands
// DISCORD CDS
// rest.put(Routes.applicationGuildCommands(process.env.CLIENTID, '...'), { body: [] })
// 	 .then(() => console.log('Successfully deleted all guild commands.'))
// 	 .catch(console.error);

// for global commands
// rest.put(Routes.applicationCommands(process.env.CLIENTID), { body: [] })
// 	.then(() => console.log('Successfully deleted all application commands.'))
// 	.catch(console.error);

// and deploy your commands!
(async () => {
    try {
        console.log(
            `Started refreshing ${globalCommands.length + guildCommands.length} application (/) commands.`,
        );

        // The put method is used to fully refresh all commands in the guild with the current set
        // GLOBAL !
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENTID),
            { body: globalCommands },
        );
        console.log(
            `Successfully reloaded ${data.length} global application (/) commands.`,
        );

        // Guild-only (DEV)
        const dataDev = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENTID,
                process.env.DEV_GUILD_ID,
            ),
            { body: guildCommands },
        );
        console.log(
            `Successfully reloaded ${dataDev.length} dev (guild-only) application (/) commands.`,
        );
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
