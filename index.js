const { Client, Intents, Collection } = require('discord.js');
const {TOKEN, PREFIX} = require('./config.js');
const { loadCommands, loadEvents } = require('./util/loader');
const axios = require('axios');
require('date.format');

const myIntents = new Intents();
myIntents.add(Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.DIRECT_MESSAGES)

const client = new Client({ intents: myIntents });
require('./util/functions')(client);
//client.commands = new Collection();
//client.aliases = new Collection();
["commands", "aliases"].forEach(x => client[x] = new Collection());
client.mongoose = require("./util/mongoose");

loadCommands(client);
loadEvents(client);
client.mongoose.init();

// A METTRE A JOUR discord.js v12 -> v13 + -> loadEvents
// client.on('raw', async e => {
//     if(e.t === 'INTERACTION_CREATE'){
//         const url = `https://discord.com/api/v8/interactions/${e.d.id}/${e.d.token}/callback`;
//         const body = {
//             "type": 4,
//             "data": {
//                 content: "test"
//             }
//         }
//         const data = await axios.post(url, body, null);
//         console.log(data);
//     }
// });

client.on('error', console.error);
client.on('warn', console.warn);

client.login(TOKEN);