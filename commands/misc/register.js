const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { PREFIX } = require("../../config");
const {green, dark_red} = require('../../data/colors.json');
const { check_mark, cross_mark } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants.js');

module.exports.run = async (client, message, args) => {
    try {
        const dbUser = await client.getUser(message.member);
        if(dbUser) throw `${cross_mark} Tu es déjà inscrit !`; // Si dans la BDD

        if (!args[0]) throw (`${cross_mark} Merci de renseigner ton id Steam ! \`${PREFIX}register <steam id>\`\nTu peux retrouvé ton id ici (au format : SteamId64): https://steamid.xyz/`);
        
        steamId = args[0];
        if(!(steamId.length == 17 && steamId > 0)) throw (`${cross_mark} Id Steam non valide !`); // Vérification validité id
        
        // récupère l'utilisateur steam
        let userSteam = await client.getPlayerSummaries(steamId)
        
        if(!userSteam) throw `${cross_mark} L'id de l'utilisateur : \`${userSteam}\` non trouvé `; // vérificaation de si l'id steam existe

        let rows = [];

        let row = new MessageActionRow();
        row.addComponents(
            new MessageButton()
                .setCustomId("confirm")
                .setLabel('Confirmer')
                .setEmoji(check_mark)
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId("cancel")
                .setLabel('Annuler')
                .setEmoji(cross_mark)
                .setStyle('DANGER')
        );
        rows.unshift(row);

        const embedVerif = new MessageEmbed()
            .setColor(green)
            .setTitle('Vérification')
            .setDescription(`Confirmez-vous être l'utilisateur : ${userSteam.body.response.players[0].personaname}`);

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
                    .setColor(green)
                    .setTitle(`${check_mark} Vous êtes désormais inscrit`)

                message.channel.send({embeds: [embed]});
            } else {
                const embed = new MessageEmbed()
                    .setColor(dark_red)
                    .setTitle(`${cross_mark} Annulation de l'inscription...`)

                message.channel.send({embeds: [embed]});
            }
        })
        .catch(error => {
            msgEmbed.delete();
            const embed = new MessageEmbed()
                .setColor(dark_red)
                .setTitle(`${cross_mark} Temps écoulé ! Annulation de l'inscription...`)

            message.channel.send({embeds: [embed]});
        });

        // console.log(`\x1b[34m[INFO]\x1b[0m .. ${interaction.customId} choisi`);
        // const btnId = interaction.customId;
        // msgEmbed.delete();
        
        // if(btnId === 'confirm') { // Si ok
        //     await client.createUser({
        //         userId: message.member.id,
        //         username: message.member.user.tag,
        //         steamId: steamId,
        //     });

        //     const embed = new MessageEmbed()
        //         .setColor(green)
        //         .setTitle(`${check_mark} Vous êtes désormais inscrit`)

        //     message.channel.send({embeds: [embed]});
        // } else {
        //     const embed = new MessageEmbed()
        //         .setColor(dark_red)
        //         .setTitle(`${cross_mark} Annulation de l'inscription...`)

        //     message.channel.send({embeds: [embed]});
        // }

        

    } catch (err) {
        const embedError = new MessageEmbed()
            .setColor(dark_red)
            .setTitle(`${err}`);
    
        return message.channel.send({embeds: [embedError]});
    }
}

module.exports.help = MESSAGES.COMMANDS.MISC.REGISTER;