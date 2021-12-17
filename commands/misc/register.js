const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { PREFIX } = require("../../config");
const {GREEN, DARK_RED} = require('../../data/colors.json');
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants.js');

module.exports.run = async (client, message, args) => {
    const dbUser = await client.getUser(message.member);
    if(dbUser) return error(`Tu es déjà inscrit !`); // Si dans la BDD

    if (!args[0]) return error(`Merci de renseigner ton id Steam ! \`${PREFIX}register <steam id>\`\nTu peux retrouvé ton id ici (au format : SteamId64): https://steamid.xyz/`);
    
    steamId = args[0];
    if(!(steamId.length == 17 && steamId > 0)) return error(`Id Steam non valide !`); // Vérification validité id
    
    // récupère l'utilisateur steam
    let userSteam = await client.getPlayerSummaries(steamId)
    
    if(!userSteam) return error(`L'id de l'utilisateur : \`${userSteam}\` non trouvé `); // vérificaation de si l'id steam existe

    let rows = [];

    let row = new MessageActionRow();
    row.addComponents(
        new MessageButton()
            .setCustomId("confirm")
            .setLabel('Confirmer')
            .setEmoji(CHECK_MARK)
            .setStyle('SUCCESS'),
        new MessageButton()
            .setCustomId("cancel")
            .setLabel('Annuler')
            .setEmoji(CROSS_MARK)
            .setStyle('DANGER')
    );
    rows.unshift(row);

    const embedVerif = new MessageEmbed()
        .setColor(GREEN)
        .setTitle('Vérification')
        .setDescription(`Confirmez-vous être l'utilisateur : **${userSteam.body.response.players[0].personaname}**`)
        .setThumbnail(userSteam.body.response.players[0].avatarmedium); // .avatarfull -> pour plus grande image

    let msgEmbed = await message.channel.send({embeds: [embedVerif], components: rows});

    const filter = i => {return i.user.id === message.author.id}
    let interaction = msgEmbed.awaitMessageComponent({
        filter,
        componentType: 'BUTTON',
        time: 30000
    })
    .then(async interaction => {
        //console.log(`\x1b[34m[INFO]\x1b[0m .. ${interaction.customId} choisi`);
        const btnId = interaction.customId;
        msgEmbed.delete();
        
        if(btnId === 'confirm') { // Si ok
            await client.createUser({
                userId: message.member.id,
                username: message.member.user.tag,
                steamId: steamId,
            });

            const embed = new MessageEmbed()
                .setColor(GREEN)
                .setTitle(`${CHECK_MARK} Vous êtes désormais inscrit`)

            message.channel.send({embeds: [embed]});
        } else {
            const embed = new MessageEmbed()
                .setColor(DARK_RED)
                .setTitle(`${CROSS_MARK} Annulation de l'inscription...`)

            message.channel.send({embeds: [embed]});
        }
    })
    .catch(error => {
        msgEmbed.delete();
        const embed = new MessageEmbed()
            .setColor(DARK_RED)
            .setTitle(`${CROSS_MARK} Temps écoulé ! Annulation de l'inscription...`)

        message.channel.send({embeds: [embed]});
    });

    function error(err) {
        const errorEmbed = new MessageEmbed()
            .setColor(DARK_RED)
            .setTitle(`${CROSS_MARK} | ${err}`);
    
        return message.channel.send({embeds: [errorEmbed]});
    }
}

module.exports.help = MESSAGES.COMMANDS.MISC.REGISTER;