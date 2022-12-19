const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
//const { TOKEN } = require('./config.js');
const { loadCommands, loadEvents, loadBatch, loadReactionGroup, loadSlashCommands, loadRoleGiver, loadReactionMsg, loadVocalCreator } = require('./util/loader');
const winston = require("winston");
require('winston-daily-rotate-file');
require("dotenv").config();

var transport = new winston.transports.DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});
global.logger = winston.createLogger({
  transports: [
    transport,
    new winston.transports.Console({
      level: 'silly',
      format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
      )
    })
  ],
  format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
  )
});
require('date.format');

const client = new Client({ intents: [GatewayIntentBits.GuildPresences, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans, 
  GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.DirectMessages,
  GatewayIntentBits.GuildVoiceStates] });
require('./util/functions')(client);
require('./util/steam')(client);
//client.commands = new Collection();
//client.aliases = new Collection();
["commands", "aliases"].forEach(x => client[x] = new Collection());
client.mongoose = require("./util/mongoose");

loadCommands(client);
//loadEvents(client);
client.mongoose.init();

// EVENTS SLASH COMMAND
client.on(Events.InteractionCreate, async interaction => {
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
});

client.on('error', console.error);
client.on('warn', console.warn);

//client.login(TOKEN).then(c => {
client.login(process.env.TOKEN).then(c => {
    //loadBatch(client);
    //loadReactionGroup(client);
})

client.once(Events.ClientReady, c => {
  console.log(`
  oooooooo8 ooooooooo    oooooooo8       oooooooooo    ooooooo   ooooooooooo 
o888     88  888    88o 888               888    888 o888   888o 88  888  88 
888          888    888  888oooooo        888oooo88  888     888     888     
888o     oo  888    888         888       888    888 888o   o888     888     
 888oooo88  o888ooo88   o88oooo888       o888ooo888    88ooo88      o888o    
    `);

});
// client.on('ready', async () => {
//   await loadSlashCommands(client);

//   await loadBatch(client);
  
//   logger.info(`Chargement des messages 'events' ..`)
//   await loadReactionGroup(client);
//   logger.info(`.. terminé`)
  
//   logger.info(`Chargement des reactions hall héros/zéros ..`)
//   await loadReactionMsg(client);
//   logger.info(`.. terminé`)

//   logger.info(`Chargement du chan vocal créateur ..`)
//   await loadVocalCreator(client);
//   logger.info(`.. terminé`)

//   loadRoleGiver(client);
// });