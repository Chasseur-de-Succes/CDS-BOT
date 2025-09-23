const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ButtonBuilder,
} = require("discord.js");
const { GREEN, DARK_RED } = require("../data/colors.json");
const { CHECK_MARK, CROSS_MARK } = require("../data/emojis.json");
const { createError } = require("../util/envoiMsg");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("register")
        .setDescription(`Création d'un compte CDS`)
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("id-steam-64")
                .setDescription("ID Steam 64 (trouvable sur steamid.xyz/)")
                .setMinLength(17)
                .setMaxLength(17)
                .setRequired(true),
        ),
    async execute(interaction) {
        const steamId64 =
            interaction.options.getString("id-steam-64") ??
            "Aucune id64 renseignée.";
        const client = interaction.client;
        const member = interaction.member;
        const user = interaction.user;
        const dbUser = await client.getUser(member);

        if (dbUser)
            // Si dans la BDD
            return interaction.reply({
                embeds: [createError("Tu es déjà inscrit !")],
            });

        if (steamId64.length !== 17)
            return interaction.reply({
                embeds: [
                    createError(
                        "ID Steam non valide !\nID trouvable, au format SteamID64, ici : https://steamid.xyz/",
                    ),
                ],
            });

        // récupère l'utilisateur steam
        const userSteam = await client.getPlayerSummaries(steamId64);

        if (!userSteam || userSteam.body.response.players.length === 0)
            // vérification de si l'id steam existe
            return interaction.reply({
                embeds: [
                    createError(
                        "ID Steam non existant !\nID trouvable, au format SteamID64, ici : https://steamid.xyz/",
                    ),
                ],
            });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("confirm")
                .setLabel("Confirmer")
                .setEmoji(CHECK_MARK)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("cancel")
                .setLabel("Annuler")
                .setEmoji(CROSS_MARK)
                .setStyle(ButtonStyle.Danger),
        );

        const embedVerif = new EmbedBuilder()
            .setColor(GREEN)
            .setTitle("Vérification")
            .setDescription(
                `Confirmez-vous être l'utilisateur : **${userSteam.body.response.players[0].personaname}**`,
            )
            .setThumbnail(userSteam.body.response.players[0].avatarmedium); // .avatarfull -> pour plus grande image

        const msg = await interaction.reply({
            embeds: [embedVerif],
            components: [row],
            fetchReply: true,
        });

        const confirmFilter = (i) =>
            i.customId === "confirm" && i.user.id === interaction.user.id;
        const cancelFilter = (i) =>
            i.customId === "cancel" && i.user.id === interaction.user.id;

        // COLLECTOR sur le message créé
        const timer = 30000; // (30 seconds)
        const confirm = msg.createMessageComponentCollector({
            filter: confirmFilter,
            time: timer,
        });
        const cancel = msg.createMessageComponentCollector({
            filter: cancelFilter,
            time: timer,
        });

        confirm.on("collect", async (i) => {
            await i.deferUpdate();
            await i.editReply({ components: [] });

            await client.createUser({
                userId: member.id,
                username: user.tag,
                steamId: steamId64,
            });

            const embed = new EmbedBuilder()
                .setColor(GREEN)
                .setTitle(`${CHECK_MARK} Vous êtes désormais inscrit`);

            confirm.stop();
            return interaction.editReply({ embeds: [embed] });
        });

        cancel.on("collect", async (i) => {
            await i.deferUpdate();
            await i.editReply({ components: [] });

            const embed = new EmbedBuilder()
                .setColor(DARK_RED)
                .setTitle(`${CROSS_MARK} Inscription annulée`);

            return interaction.editReply({ embeds: [embed] });
        });

        // Enleve les boutons si timeout
        confirm.on("end", () => {
            const embed = new EmbedBuilder()
                .setColor(DARK_RED)
                .setTitle(`${CROSS_MARK} Inscription annulée`);
            interaction.editReply({ embeds: [embed], components: [] });
        });
    },
};
