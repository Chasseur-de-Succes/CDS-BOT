const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    ActivityType,
    InteractionContextType,
} = require("discord.js");
const {
    VERY_PALE_VIOLET,
    VERY_PALE_BLUE,
    CRIMSON,
} = require("../data/colors.json");
const { STEAM, ASTATS, CME, SH } = require("../data/emojis.json");
const { createError } = require("../util/envoiMsg");
const { getXpNeededForNextLevel } = require("../util/xp");
const { renderProfile } = require("../canvas/profile/renderProfile");

const { UserRepository, MetaAchRepository } = require("../repositories");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setContexts(InteractionContextType.Guild)
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
            const achievements = await MetaAchRepository.findAllAchievements();
            for (const achievement of achievements) {
                filtered.push({
                    name: achievement.title,
                    value: achievement.code,
                });
            }
        }
        await interaction.respond(filtered);
    },
    async execute(interaction) {
        const user = interaction.options.getUser("target") ?? interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        const typeSucces = interaction.options.get("succes")?.value;

        await interaction.deferReply();

        const userDb = await UserRepository.findByDiscordId(user.id);

        if (!userDb) {
            // Si pas dans la BDD
            const embedErr = createError(
                `${user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
            );
            return interaction.editReply({ embeds: [embedErr] });
        }

        const colorEmbed =
            userDb.banned || userDb.blacklisted ? CRIMSON : VERY_PALE_BLUE; //si banni ou blacklisté -> couleur en rouge
        const pseudo = user.username;
        const money = userDb.money;

        // AFFICHAGE SUCCES
        if (typeSucces) {
            const infoSucces =
                await MetaAchRepository.findMetaAchievementByCode(typeSucces);
            if (!infoSucces) {
                const embedErr = createError(
                    `Le succès \`${typeSucces}\` n'existe pas.`,
                );
                return interaction.editReply({ embeds: [embedErr] });
            }

            const tiers = await MetaAchRepository.findTiersWithUnlockStatus(
                userDb.id,
                typeSucces,
            );

            let desc = "";
            for (const tier of tiers) {
                const achieved = tier.unlocked;

                if (achieved) {
                    desc += "✅ ";
                } else {
                    desc += "⬛ ";
                }
                desc += `**${tier.title}**\n`;

                if (achieved) {
                    desc += `> ${tier.description}\n`;
                } else {
                    desc += `> ||${tier.description}||\n`;
                }
            }
            const embed = new EmbedBuilder()
                .setColor(colorEmbed)
                .setTitle(`${infoSucces.title} de ${user.tag}`)
                .setDescription(`${desc}`);

            return interaction.editReply({ embeds: [embed] });
        }

        // AFFICHAGE CANVAS
        const urlSteam = `[Steam](https://steamcommunity.com/profiles/${userDb.steamId})`;
        const urlCme = `[Completionist](https://completionist.me/steam/profile/${userDb.steamId})`;
        const urlSh = `[Steam Hunters](https://steamhunters.com/id/${userDb.steamId}/games)`;

        const msg = `[ ${STEAM} ${urlSteam} | ${CME} ${urlCme} | ${SH} ${urlSh} ]`;

        const codeFlag = undefined; // todo pour après migration bdd

        // progression = requirement du palier débloqué le plus haut, par code
        const unlockedTiers = await MetaAchRepository.findUnlockedTiersByUser(
            userDb.id,
        );
        const stats = {};
        for (const tier of unlockedTiers) {
            if (!stats[tier.code] || tier.requirement > stats[tier.code]) {
                stats[tier.code] = tier.requirement;
            }
        }

        // create image
        const dataCanvas = {
            user,
            pseudo,
            money,
            level: userDb.level,
            xp: userDb.xp,
            nextXpNeeded: getXpNeededForNextLevel(userDb.level),
            game: member.presence?.activities.find((a) => a.type === 0),
            codeFlag, // undefined si pas de drapeau

            stats,
            userDb,
        };

        const image = await renderProfile(dataCanvas, "default");

        const file = new AttachmentBuilder(image, {
            name: `profile_${pseudo}.png`,
        });

        const embed = new EmbedBuilder()
            .setColor(VERY_PALE_VIOLET)
            .setDescription(`${msg}`);

        // Send message
        await interaction.editReply({ embeds: [embed], files: [file] });
    },
};
