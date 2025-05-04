const { EmbedBuilder } = require("discord.js");
const { createError, createLogs } = require("../../../util/envoiMsg");
const { GREEN } = require("../../../data/colors.json");

const givemoney = async (interaction, options) => {
    const client = interaction.client;
    const author = interaction.user;
    const user = interaction.options.getUser("target") ?? interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    let montant = interaction.options.get("montant")?.value;
    const MONEY = process.env.MONEY;

    const dbUser = await client.getUser(member);
    if (!dbUser) {
        // Si pas dans la BDD
        const embedErr = createError(
            `${user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
        );
        return interaction.reply({ embeds: [embedErr] });
    }

    let money = dbUser.money;
    money += montant;
    if (money < 0) {
        montant -= money;
        money = 0;
    }
    const msgCustom = `${author} ${
        montant > 0 ? "a donné" : "a retiré"
    } **${Math.abs(
        montant,
    )}** ${MONEY} à ${user}\nSon argent est désormais de : **${money}** ${MONEY}`;

    await client.update(dbUser, { money: money });
    logger.warn(
        `${author.tag} a effectué la commande admin : givemoney ${montant}`,
    );

    await createLogs(
        client,
        interaction.guildId,
        `Modification ${MONEY}`,
        `${msgCustom}`,
        "",
        GREEN,
    );

    const embed = new EmbedBuilder()
        .setColor(GREEN)
        .setDescription(`${msgCustom}`);

    return interaction.reply({ embeds: [embed] });
};

exports.givemoney = givemoney;
