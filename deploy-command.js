const path = require("path");
const { reloadCommands } = require("./util/reloadCommands");

console.log(`Started refreshing application (/) commands.`);

//const commandsPath = "./slash_commands/";
const commandsPath = path.join(__dirname, "slash_commands");

(async () => {
    try {
        await reloadCommands(commandsPath);
    } catch (error) {
        console.error(`Échec du rechargement des commandes : ${error.message}`);
    }
})();
