const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
require("dotenv").config();

// recup config
process.env.cli

const commands = [];
// Grab all the command files from the commands directory you created earlier
const commandFiles = fs.readdirSync('./slash_commands/').filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
	const command = require(`./slash_commands/${file}`);
	commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// for guild-based commands
// DELETE SUR DISCORD TOBI
//rest.put(Routes.applicationGuildCommands(process.env.CLIENTID, '879355152694394933'), { body: [] })
// DISCORD KEK
// rest.put(Routes.applicationGuildCommands(process.env.CLIENTID, '562661057307344898'), { body: [] })
// DISCORD CDS
//rest.put(Routes.applicationGuildCommands(process.env.CLIENTID, '378545103788048395'), { body: [] })
	// .then(() => console.log('Successfully deleted all guild commands.'))
	// .catch(console.error);

// for global commands
// rest.put(Routes.applicationCommands(process.env.CLIENTID), { body: [] })
// 	.then(() => console.log('Successfully deleted all application commands.'))
// 	.catch(console.error);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
            // GLOBAL !
			Routes.applicationCommands(process.env.CLIENTID),
            // SEULEMENT POUR TEST SUR LE DISCORD DE KEKWEL
			//Routes.applicationGuildCommands(process.env.CLIENTID, '562661057307344898'),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();