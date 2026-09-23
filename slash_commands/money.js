const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { GREEN } = require("../data/colors.json");
const { createError } = require("../util/envoiMsg");
const { UserRepository } = require("../repositories");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("money")
        .setContexts(InteractionContextType.Guild)
        .setDescription(`Combien j'ai de ${process.env.MONEY} ?`)
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("De cet utilisateur en particulier"),
        ),
    async execute(interaction) {
        const user = interaction.options.getUser("target") ?? interaction.user;
        const member = interaction.guild.members.cache.get(user.id);

        const dbUser = await UserRepository.findByDiscordUser(member);
        if (!dbUser) {
            // Si pas dans la BDD
            return interaction.reply({
                embeds: [
                    createError(
                        `${member.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
                    ),
                ],
            });
        }

        const embed = new EmbedBuilder()
            .setColor(GREEN)
            .setDescription(
                `💰 ${member.user} possède **${dbUser.money}** ${process.env.MONEY} 💰`,
            );

        return interaction.reply({ embeds: [embed] });
    },
};
