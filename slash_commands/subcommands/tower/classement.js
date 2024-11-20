const { User, GuildConfig } = require("../../../models");
const { EmbedBuilder } = require("discord.js");
const { CDS } = require("../../../data/emojis.json");
const classement = async (interaction, options) => {
    // TODO option pour afficher le classement d'une saison précise
    // TODO option pour afficher le classement d'un joueur précis ?
    const client = interaction.client;
    const guildId = interaction.guildId;
    const guild = await GuildConfig.findOne({ guildId: guildId });
    const season = guild.event.tower.currentSeason;

    // récupérer les 10 premiers joueurs du classement
    const leaderboard = await User.find({ "event.tower.season": 0 })
        .sort({ "event.tower.etage": -1, "event.tower.totalDamage": -1 })
        .limit(10);

    // créer un tableau contenant les positions, les joueurs et les dégâts
    let positions = "**";
    let joueurs = "";
    let degats = "**";
    let positionsUserCourant;
    let positionExaequo;
    let degatsUserCourant;
    let messageFooter;
    let i = 1;
    for (const user of leaderboard) {
        const discordUser = await client.users.fetch(user.userId);
        // si degats est le même que le joueur précédent, on met un ex aequo
        const exaequo =
            i > 1 &&
            user.event.tower.etage + user.event.tower.totalDamage ===
                leaderboard[i - 2].event.tower.etage +
                    leaderboard[i - 2].event.tower.totalDamage;
        if (exaequo) {
            if (typeof positionExaequo === "undefined") {
                positionExaequo = i - 1;
            }
            positions += "= \n";
        } else {
            positionExaequo = undefined;
            positions += `${i} - \n`;
        }
        joueurs += `${discordUser}\n`;
        degats += `${user.event.tower.etage + user.event.tower.totalDamage}\n`;

        // récupère le classement de l'utilisateur courant s'il n'est pas premier
        if (user.userId === interaction.user.id) {
            positionsUserCourant = i;
            if (positionExaequo) {
                if (positionExaequo === 1) {
                    positionsUserCourant = `${positionExaequo}er(e) ex aequo`;
                } else {
                    positionsUserCourant = `${positionExaequo}ème ex aequo`;
                }
            }
            degatsUserCourant =
                user.event.tower.etage + user.event.tower.totalDamage;
        }
        i++;
    }
    positions += "**";
    joueurs += "";
    degats += "**";

    if (typeof positionsUserCourant === "undefined") {
        messageFooter = "Tu n'as pas l'air d'être inscrit..";
    } else {
        if (positionsUserCourant === 1) positionsUserCourant = "🥳1er(e)🥳";
        if (positionsUserCourant >= 1)
            positionsUserCourant = `${positionsUserCourant}ème`;
        messageFooter = `Toi tu es ${positionsUserCourant} avec ${degatsUserCourant}🏆`;
    }

    // créer un embed contenant le classement
    const embed = new EmbedBuilder()
        .setTitle(`Saison ${season}`)
        .setDescription("Qui a complété le plus de jeu à 💯% ?")
        .addFields(
            { name: "🏁", value: positions, inline: true },
            { name: `${CDS}`, value: joueurs, inline: true },
            { name: "🏆", value: degats, inline: true },
        )
        .setFooter({
            text: messageFooter,
        });
    interaction.reply({ embeds: [embed], ephemeral: true });
};

exports.classement = classement;
