const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const axios = require('axios');
require('date.format');

const fs = require('fs')
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();

fs.readdir('./commands/', (err, files) => {
    if(err) console.log(err);

    let jsFile = files.filter(f => f.split('.').pop() === 'js');
    if(jsFile.length <= 0 ) {
        return console.log('[LOGS] Commande introuvable');
    }

    jsFile.forEach((f, i) => {
        let props = require(`./commands/${f}`);
        client.commands.set(props.config.name, props);
        props.config.aliases.forEach(alias => {
            client.aliases.set(alias, props.config.name);
        });
    });
});

client.on('ready', () => {
    const date = new Date();
    console.log(`Logged in as ${client.user.tag}! Version: ${config.version}. On ${date.format("{MM}/{DD}/{Y} at {hh}:{mm}:{ss}")}.`);
    client.user.setActivity(`faire un 100% | v${config.version}`, {type: 'PLAYING'});
});

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

client.on('message', async msg => {
    if (msg.content === 'ping') {
        msg.reply('pong');
    }
    const PREFIX = config.PREFIX;

    if(msg.author.bot || msg.channel.type === "dm") return;
    if(!msg.content.startsWith(PREFIX)) return; // n'est pas le prefix

    let messageArray = msg.content.split(' ');
    let command = messageArray[0];
    let args = messageArray.slice(1);
    let commandFile = client.commands.get(command.slice(PREFIX.length)) || client.commands.get(client.aliases.get(command.slice(PREFIX.length)));
    if(commandFile) commandFile.run(client, msg, args);
});

client.login(config.token);

client.on('error', console.error);
client.on('warn', console.warn);