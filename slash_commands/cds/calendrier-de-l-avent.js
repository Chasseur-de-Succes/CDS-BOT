const { MessageEmbed } = require("discord.js");
const { MESSAGES } = require("../../util/constants");
const { createError } = require('../../util/envoiMsg');
const { GREEN } = require('../../data/colors.json');
const { User } = require("../../models");

module.exports.run = async (interaction) => {
    const client = interaction.client;
    let user = interaction.user;
    let userDB = await User.findOne({ userId: user.id });
    
    if (!userDB)
        return;

    // - recup top 10 des user qui ont des points
    const agg = [{
            $match :{
                'event.2022.advent.score': { '$exists': true }
            }
        },
        {
            $sort: { "event.2022.advent.score": -1 }
        }
    ]
    const top10 = await User.aggregate(agg);

    let classement = ``;
    let classementUser;

    for (let i = 0; i < 10; i++) {
        let ligne = (i + 1) + 'ème - ';
        const u = top10[i];
        // 1er, 2eme, 3eme, ...
        if (i === 0) ligne = '🥇 - ';
        else if (i === 1) ligne = '🥈 - ';
        else if (i === 2) ligne = '🥉 - ';
        else if (i === 3) ligne = '4️⃣ - ';
        else if (i === 4) ligne = '5️⃣ - ';
        else if (i === 5) ligne = '6️⃣ - ';
        else if (i === 6) ligne = '7️⃣ - ';
        else if (i === 7) ligne = '8️⃣ - ';
        else if (i === 8) ligne = '9️⃣ - ';
        else if (i === 9) ligne = '🔟 - ';

        if (u) {
            ligne += `**${u.event[2022].advent.score} pts** - <@${u.userId}>`;

            if (u.userId === userDB.userId) {
                ligne += ' 👋';
                classementUser = i + 1;
            }
        }

        classement += ligne + '\n';
    }

    // - si user dejà dans top 10, pas besoin
    if (!classementUser) {
        let indexUser = top10.findIndex(u => u.userId === userDB.userId);
        if (indexUser >= 0) {
            classementUser = indexUser + 1;
            
            classement += ' ***---*** \n';
            classement += `Toi, tu es **${classementUser}ème**, avec ${top10[indexUser].event[2022].advent.score} points !`;
        } else {
            classement += ' ***---*** \n';
            classement += `Tu n'as pas encore répondu à une des questions !`;
        }
    }

    await interaction.deferReply();

    const embed = new MessageEmbed()
        .setColor(GREEN)
        .setTitle(`🏆 - Classement des points calendrier de l'avent - 🏆`)
        .setDescription(`${classement}`)
        //.setFooter({ text: `par ${tag}`});

    return interaction.editReply({ embeds: [embed] });
}


module.exports.help = MESSAGES.COMMANDS.CDS.CALENDRIERDELAVENT;