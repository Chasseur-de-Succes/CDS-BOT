const { MESSAGES } = require("../../util/constants");

module.exports.run = (client, message, args) => {
    message.channel.send("Test");
    console.log(`\x1b[31mTest\x1b[34m--x--\x1b[33mTest\x1b[0m`);
    console.log(`\x1b[37m\x1b[43mTest x\x1b[0m`);

}

module.exports.help = {
    name: "temp",
    aliases: ["test"],
    category: "admin",
    cooldown: 0,
    description: "test temp commande",
    usage: ""
};