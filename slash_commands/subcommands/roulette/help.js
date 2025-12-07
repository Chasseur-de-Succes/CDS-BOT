const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { ROULETTE } = require("../../../util/constants");
const { CHECK_MARK } = require("../../../data/emojis.json");
const { CORNFLOWER_BLUE } = require("../../../data/colors.json");

const help = async (interaction, options) => {
    const helpEmbed = new EmbedBuilder()
        .setTitle("Roulette - Aide")
        .setColor(CORNFLOWER_BLUE)
        .setDescription(
            `La roulette sélectionne aléatoirement un jeu Steam que vous n’avez pas encore terminé. Finissez-le pour gagner des récompenses !`,
        )
        .addFields(
            {
                name: "Fonctionnement",
                value: `Un tirage est possible **toutes les ${ROULETTE.TIMER}h**. Vous pouvez accepter ou le refuser. **En acceptant vous miserez ${ROULETTE.BET} ${process.env.MONEY}**.\n⚠️ Si vous validez le tirage, vous ne pourrez plus relancer la roulette tant que le jeu n’aura pas été terminé.`,
            },
            {
                name: "Validation",
                value: `Une fois le jeu terminé à **100%**, utilisez :\n\`/roulette validate\`\nVous recevrez alors **${ROULETTE.PROFIT} ${process.env.MONEY}** (le double de votre mise).`,
            },
            {
                name: "Notes",
                value: `• Seuls les jeux **non terminés** sont pris en compte.\n• Les jeux gratuits ne sont pas pris en compte.\n• Les jeux brocken peuvent être relancés sans coût (tout abus sera sanctionné !).\n• Gain maximum : ${ROULETTE.PROFIT} ${process.env.MONEY}`,
            },
        );
    return interaction.reply({ embeds: [helpEmbed] });
};

exports.help = help;
