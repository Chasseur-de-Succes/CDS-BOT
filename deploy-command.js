const path = require("path");
const { reloadCommands } = require("./util/reloadCommands");

console.log(`Started refreshing application (/) commands.`);

//const commandsPath = "./slash_commands/";
const commandsPath = path.join(__dirname, "slash_commands");

(async () => {
    try {
        const result = await reloadCommands(commandsPath);
        console.log(
            `Successfully reloaded ${data.length} application (/) commands.`,
        );
    } catch (error) {
        console.error(`Échec du rechargement des commandes : ${error.message}`);
    }
})();
