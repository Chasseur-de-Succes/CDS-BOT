const { version, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { GREEN} = require('../data/colors.json');
const cpuStat = require('cpu-stat');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDMPermission(false)
        .setDescription('Informations sur le bot'),
    async execute(interaction) {
        const client = interaction.client;
        const botIcon = client.user.displayAvatarURL();
        const VERSION = process.env.VERSION;
        
        cpuStat.usagePercent(function (err, percent, second){
            if(err) {
                logger.error(err);
            }
            const Tobi = client.users.cache.get("229312422043713537");
            const Kekwel = client.users.cache.get("283681024360054785");
            const Rick = client.users.cache.get("163697401935298560");
    
            const timeUp = client.uptime;
            const embedInfo = new EmbedBuilder()
                .setColor(GREEN)
                .setTitle(client.user.username)
                .setDescription(`La version actuelle est ${VERSION}`)
                .setThumbnail(botIcon)
                .addFields(
                    { name: 'Développeur', value: `- ${Tobi.tag} \n- ${Kekwel.tag} \n- ${Rick.tag}` },
                    { name: 'Créé le', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:f>` },
                    { name: 'Langage', value: `JavaScript`, inline: true},
                    { name: 'Library', value: `discord.js`, inline: true },
                    { name: 'Discord.js', value: `v${version}`, inline: true },
                    { name: 'Uptime', value: 
                        (Math.round(timeUp / (1000 * 60 * 60 * 24))) + " days, " 
                        + (Math.round(timeUp / (1000 * 60 * 60)) % 24) + " hrs, " 
                        + (Math.round(timeUp / (1000 * 60)) % 60) + " mins and " 
                        + (Math.round(timeUp / 1000) % 60) + " sec" },
                )
                .setFooter({ text: 'Demandé par ' + interaction.user.username});
    
            return interaction.reply({embeds: [embedInfo]});
        })
    },
}