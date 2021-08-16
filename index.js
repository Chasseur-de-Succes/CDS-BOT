const { Client, Collection } = require('discord.js');
const {TOKEN, PREFIX} = require('./config.js');
const { loadCommands, loadEvents } = require('./util/loader');
const axios = require('axios');
require('date.format');

const client = new Client();
require('./util/functions')(client);
//client.commands = new Collection();
//client.aliases = new Collection();
["commands", "aliases"].forEach(x => client[x] = new Collection());
client.mongoose = require("./util/mongoose");

loadCommands(client);
loadEvents(client);
client.mongoose.init();

client.on('raw', async e => {
    if(e.t === 'INTERACTION_CREATE'){
        const url = `https://discord.com/api/v8/interactions/${e.d.id}/${e.d.token}/callback`;
        const body = {
            "type": 4,
            "data": {
                content: "test"
            }
        }
        const data = await axios.post(url, body, null);
        console.log(data);
    }
});

client.on('error', console.error);
client.on('warn', console.warn);

client.login(TOKEN);