const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    ActivityType,
} = require("discord.js");
const succes = require("../data/achievements.json");
const {
    VERY_PALE_VIOLET,
    VERY_PALE_BLUE,
    CRIMSON,
} = require("../data/colors.json");
const { STEAM, ASTATS, CME, SH } = require("../data/emojis.json");
const { createError } = require("../util/envoiMsg");
const { getXpNeededForNextLevel } = require("../util/xp");
const { renderProfile } = require("../canvas/profile/renderProfile");

const { getJsonValue } = require("../util/util");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDMPermission(false)
        .setDescription("Affiche le profil d'un utilisateur.")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Cet utilisateur en particulier"),
        )
        .addStringOption((option) =>
            option
                .setName("succes")
                .setDescription("Affiche les succès du profile")
                .setAutocomplete(true),
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused(true);
        const filtered = [];

        if (focusedValue.name === "succes") {
            for (const x in succes) {
                filtered.push({ name: succes[x].title, value: x });
            }
        }
        await interaction.respond(filtered);
    },
    async execute(interaction) {
        const client = interaction.client;
        const user = interaction.options.getUser("target") ?? interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        const typeSucces = interaction.options.get("succes")?.value;

        await interaction.deferReply();

        const dbUser = await client.getUser(member);

        if (!dbUser) {
            // Si pas dans la BDD
            const embedErr = createError(
                `${user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
            );
            return interaction.editReply({ embeds: [embedErr] });
        }

        const colorEmbed =
            dbUser.banned || dbUser.blacklisted ? CRIMSON : VERY_PALE_BLUE; //si banni ou blacklisté -> couleur en rouge
        const pseudo = user.username;
        const money = dbUser.money;

        // AFFICHAGE SUCCES
        if (typeSucces) {
            const userStat = dbUser.stats;
            const infoSucces = succes[typeSucces];
            // on test si 'money' car non présent dans stat.
            const nbStat =
                typeSucces === "money"
                    ? money
                    : getJsonValue(userStat, infoSucces.db, "");
            let desc = "";
            for (const x in infoSucces.succes) {
                const achieved = nbStat >= Number.parseInt(x);

                if (achieved) {
                    desc += "✅ ";
                } else {
                    desc += "⬛ ";
                }
                desc += `**${infoSucces.succes[x].title}**\n`;

                if (achieved) {
                    desc += `> ${infoSucces.succes[x].desc}\n`;
                } else {
                    desc += `> ||${infoSucces.succes[x].desc}||\n`;
                }
            }
            const embed = new EmbedBuilder()
                .setColor(colorEmbed)
                .setTitle(`${infoSucces.title} de ${user.tag}`)
                .setDescription(`${desc}`);

            return interaction.editReply({ embeds: [embed] });
        }

        // AFFICHAGE CANVAS
        const urlSteam = `[Steam](https://steamcommunity.com/profiles/${dbUser.steamId})`;
        const urlAstats = `[Astats](https://astats.astats.nl/astats/User_Info.php?SteamID64=${dbUser.steamId})`;
        const urlCme = `[Completionist](https://completionist.me/steam/profile/${dbUser.steamId})`;
        const urlSh = `[Steam Hunters](https://steamhunters.com/id/${dbUser.steamId}/games)`;

        const msg = `[ ${STEAM} ${urlSteam} | ${ASTATS} ${urlAstats} | ${CME} ${urlCme} | ${SH} ${urlSh} ]`;

        const codeFlag = undefined // todo pour après migration bdd

        // create image
        const dataCanvas = {
            user,
            pseudo,
            money,
            level: dbUser.level,
            xp: dbUser.experience,
            nextXpNeeded: getXpNeededForNextLevel(dbUser.level),
            game: member.presence?.activities.find((a) => a.type === 0),
            codeFlag, // undefined si pas de drapeau

            stats: dbUser.stats,
            dbUser, // temporaire (rework des succès nécessaire)
        };

        const image = await renderProfile(dataCanvas, 'default');

        const file = new AttachmentBuilder(image, {
            name: `profile_${pseudo}.png`,
        });

        const embed = new EmbedBuilder()
            .setColor(VERY_PALE_VIOLET)
            .setDescription(`${msg}`);

        // Send message
        await interaction.editReply({ embeds: [embed], files: [file] });
    }
}
