const { MESSAGES } = require("../../util/constants");
const { createError } = require('../../util/envoiMsg');

module.exports.run = async (interaction) => {
    const appId = interaction.options.get('appid')?.value;
    const client = interaction.client;
    let user = interaction.user;
    
    await interaction.deferReply();

    try {
        const embed = await client.fetchGame(appId, user.tag);
        return interaction.editReply({ embeds: [embed] });
    } catch (err) {
        console.log(err);
        return interaction.editReply({ embeds: [createError(`Jeu introuvable !`)] });
    }
}

module.exports.help = MESSAGES.COMMANDS.CDS.FETCHGAME;