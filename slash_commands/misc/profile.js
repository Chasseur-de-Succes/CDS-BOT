const { MessageEmbed, MessageAttachment } = require("discord.js");
const { PREFIX, MONEY } = require("../../config");
const { VERY_PALE_BLUE, DARK_RED, CRIMSON } = require('../../data/colors.json');
const { CROSS_MARK, STEAM } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants.js');
const Canvas = require('canvas');
const path = require('path');
const { createError } = require("../../util/envoiMsg");

//Canvas.registerFont('x.ttf', { family: ' name '});

module.exports.run = async (interaction) => {
    const id = interaction.options.get('user')?.value;
    const client = interaction.client;
    let member = interaction.member;
    let user = interaction.user;

    if (id) {
        member = await interaction.guild.members.fetch(id).catch(e => {});
        if (!member) {
          const embed = new MessageEmbed().setColor('#e74c3c').setDescription('Invalide ID.');
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        user = member.user;
    }

    let dbUser = await client.getUser(member);

    if (!dbUser) { // Si pas dans la BDD
        const embedErr = createError(`${member.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`${PREFIX}register\``)
        return interaction.reply({ embeds: [embedErr] });
    }

    // TODO stats groupe, boutique
    // const msg = `> **Profil** de ${member.user.tag}`;
    const colorEmbed = (dbUser.banned || dbUser.blacklisted) ? CRIMSON : VERY_PALE_BLUE; //si banni ou blacklisté -> couleur en rouge
    const banned = dbUser.banned ? "[banni] " : "";
    const blacklisted = dbUser.blacklisted ? "[blacklisté]" : "";
    const embed = new MessageEmbed()
        .setColor(colorEmbed)
        .setTitle(`${member.user.username} ${banned}${blacklisted}`)
        .setThumbnail(member.user.displayAvatarURL({dynamic : true, size: 4096}))
        .addFields(
            {name: `:flame: Niveau`, value: `${dbUser.level} (XP: ${dbUser.experience})`},
            {name: `:moneybag: Money`, value: `${dbUser.money} ${MONEY}`},
            {name: `${STEAM} Compte Steam`, value: `[Steam](http://steamcommunity.com/profiles/${dbUser.steamId})\nSteamID64: ${dbUser.steamId}`, inline: true},
            {name: `Site tracking succès`, value: `[Astats](https://astats.astats.nl/astats/User_Info.php?SteamID64=${dbUser.steamId}) | [Completionist](https://completionist.me/steam/profile/${dbUser.steamId})`, inline: true},
        );

    // CANVAS
    // const canvas = Canvas.createCanvas(500, 500);
    // const ctx = canvas.getContext('2d');
    // const background = await Canvas.loadImage(path.join(__dirname, '../../data/background.jpg'));

    // Arrondir bord background
    // ctx.beginPath();
    // ctx.arc(250,250,0.2*Math.PI,0.4*Math.PI);
    // ctx.closePath();
    // ctx.clip();

    //ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Bordure
    // ctx.strokeStyle = '#DC143C';
    // ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // const attachment = new MessageAttachment(canvas.toBuffer(), 'profile.png');
    
    // Send message
    return interaction.reply({ embeds: [embed] });
    // message.channel.send({content: msg, embeds: [embed], files: [attachment]});
}

module.exports.help = MESSAGES.COMMANDS.MISC.PROFILE;