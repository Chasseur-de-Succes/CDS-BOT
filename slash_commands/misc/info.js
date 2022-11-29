const { Message, MessageEmbed, version } = require("discord.js");
const { MESSAGES } = require("../../util/constants");
const { CORNFLOWER_BLUE, GREEN} = require('../../data/colors.json');
const { STREAMING, AMONGUS_RUNNING } = require("../../data/emojis.json");
//const { VERSION, DEV } = require("../../config.js");
const cpuStat = require('cpu-stat');
// require('date.format');

module.exports.run = async (interaction) => {
    const client = interaction.client;
    const botIcon = client.user.displayAvatarURL();
    const VERSION = process.env.VERSION;
    //const botDate = client.user.createdAt;
    //const botDateEdit = botDate.format("{DD}/{MM}/{Y} à {hh}:{mm}");

    cpuStat.usagePercent(function (err, percent, second){
        if(err) {
            logger.error(err);
        }
        const Tobi = client.users.cache.get("229312422043713537");
        const Kekwel = client.users.cache.get("283681024360054785");
        const Rick = client.users.cache.get("163697401935298560");

        const timeUp = client.uptime;
        const embedInfo = new MessageEmbed()
            .setColor(GREEN)
            .setTitle(client.user.username)
            .setDescription(`La version actuelle est ${VERSION}`)
            .setThumbnail(botIcon)
            .addField('Développeur', `- ${Tobi.tag} \n- ${Kekwel.tag} \n- ${Rick.tag}`)
            .addField('Créé le', `<t:${Math.floor(client.user.createdTimestamp / 1000)}:f>`)
            .addField('Language', 'JavaScript', true)
            .addField('Library', "discord.js", true)
            .addField('Discord.js', `v${version}`, true)
            .addField('Uptime', (Math.round(timeUp / (1000 * 60 * 60 * 24))) + " days, " + (Math.round(timeUp / (1000 * 60 * 60)) % 24) + " hrs, " + (Math.round(timeUp / (1000 * 60)) % 60) + " mins and " + (Math.round(timeUp / 1000) % 60) + " sec")
            .setFooter({ text: 'Demandé par ' + interaction.user.username});

        return interaction.reply({embeds: [embedInfo]});

    })
}

module.exports.help = MESSAGES.COMMANDS.MISC.INFO;