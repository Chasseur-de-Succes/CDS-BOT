const { EmbedBuilder } = require("discord.js");
const { CRIMSON } = require("../../../../data/colors.json");

async function history(interaction, options) {
    const userId = options.get("user")?.value;
    const client = interaction.client;
    const guildId = interaction.guildId;
    const author = interaction.member;

    await interaction.deferReply();

    const user = await client.users.fetch(userId);
    const userList = await client.getUserCheatSuspicions(userId);

    let embed = new EmbedBuilder()
        .setColor(CRIMSON)
        .setTitle(`🕵️ Historique des suspicions de triche de ${user.displayName}`)
        .setDescription(`${user}`)
        .setTimestamp();

    if(userList.length === 0) {
        embed.addFields({
            name: `😎 Aucune suspicion de triche.`,
            value: `\u200B`,
        })
    } else {
        for(const element of userList)  {
            const timestamp = Math.floor(element.date.getTime() / 1000);
            let reporter;
            try {
                const fetched = await client.users.fetch(element.reporterId);
                reporter = fetched.toString();
            } catch {
                reporter = "Utilisateur inconnu";
            }

            embed.addFields({
                name: `🔸 ${element.reason}`,
                value: `Par ${reporter}, le <t:${timestamp}:F>`,
            });
        }
    }
    
    await interaction.editReply({ embeds: [embed] });
}

exports.history = history;