const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { GREEN, DARK_RED } = require('../../data/colors.json');
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const { MESSAGES } = require('../../util/constants.js');
const { createError } = require("../../util/envoiMsg");

module.exports.run = async (interaction) => {
    const steamID64 = interaction.options.get('id-steam-64')?.value;
    const client = interaction.client;
    const member = interaction.member;
    const user = interaction.user;
    const dbUser = await client.getUser(member);

    if (dbUser) // Si dans la BDD
        return interaction.reply({ embeds: [createError(`Tu es déjà inscrit !`)] });
    
    //if (!args[0]) return error(`Merci de renseigner ton id Steam ! \`${PREFIX}register <steam id>\`\nTu peux retrouvé ton id ici (au format : SteamId64): https://steamid.xyz/`);
    
    if (steamID64.length != 17)
        return interaction.reply({ embeds: [createError(`ID Steam non valide !\nID trouvable, au format SteamID64, ici : https://steamid.xyz/`)] });
    
    // récupère l'utilisateur steam
    let userSteam = await client.getPlayerSummaries(steamID64)
    
    if (!userSteam || userSteam.body.response.players.length === 0) // vérification de si l'id steam existe
        return interaction.reply({ embeds: [createError(`ID Steam non existant !\nID trouvable, au format SteamID64, ici : https://steamid.xyz/`)] });

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

    await interaction.reply({ embeds: [embedVerif], components: rows });

    const confirmFilter = (i) => i.customId === `confirm` && i.user.id === interaction.user.id;
    const cancelFilter = (i) => i.customId === `cancel` && i.user.id === interaction.user.id;
    // 
    const timer = 3000; // (30 seconds)
    const confirm = interaction.channel.createMessageComponentCollector({ filter: confirmFilter, time: timer });
    const cancel = interaction.channel.createMessageComponentCollector({ filter: cancelFilter, time: timer });

    confirm.on('collect', async i => {
        await i.deferUpdate();
        await i.editReply({ components: [] });

        await client.createUser({
            userId: member.id,
            username: user.tag,
            steamId: steamID64,
        });

        const embed = new MessageEmbed()
            .setColor(GREEN)
            .setTitle(`${CHECK_MARK} Vous êtes désormais inscrit`)

        confirm.stop();
        return interaction.editReply({ embeds: [embed] })
    });

    cancel.on('collect', async i => {
        await i.deferUpdate();
        await i.editReply({ components: [] });

        const embed = new MessageEmbed()
            .setColor(DARK_RED)
            .setTitle(`${CROSS_MARK} Inscription annulée`)

        return interaction.editReply({ embeds: [embed] })
    });

    // Enelve les boutons si timeout
    confirm.on('end', () => {
        const embed = new MessageEmbed()
            .setColor(DARK_RED)
            .setTitle(`${CROSS_MARK} Inscription annulée`)
        interaction.editReply({ embeds: [embed], components: [] }).catch(O_o=>{});
    });
}

module.exports.help = MESSAGES.COMMANDS.MISC.REGISTER;