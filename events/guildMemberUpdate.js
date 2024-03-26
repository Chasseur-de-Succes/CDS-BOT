const { ORANGE } = require("../data/colors.json");
const { EmbedBuilder, Events } = require("discord.js");
const { sendLogs } = require("../util/envoiMsg");

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldUser, newUser) {
        // quand utilisateur a choisi role lié (auto)
        const oldRole = oldUser.roles.cache.find((r) => r.name === "Steam ✅");
        const newRole = newUser.roles.cache.find((r) => r.name === "Steam ✅");
        // si ancien role ne contient pas Steam✅ et nouveau contient Steam✅
        if (!oldRole && newRole) {
            logger.info(`.. rôle Steam✅ pour ${newUser.displayName}`);
            // remove role "Nouveau"
            const nouveau = newUser.guild.roles.cache.find(
                (r) => r.name === "Nouveau",
            );
            if (nouveau) {
                await newUser.roles.remove(nouveau);
            }

            // ajout role "Ecuyer" si pas "Chevalier"
            const ecuyer = newUser.guild.roles.cache.find(
                (r) => r.name === "Écuyer",
            );
            const chevalier = newUser.roles.cache.find(
                (r) => r.name === "Chasseur",
            );
            if (ecuyer && !chevalier) {
                await newUser.roles.add(ecuyer);
            }
        }

        // edit nickname
        if (oldUser.nickname != newUser.nickname) {
            let oldNickname = oldUser.nickname || "_Aucun_";
            let newNickname = newUser.nickname || "_Aucun_";
            const embed = new EmbedBuilder()
                .setColor(ORANGE)
                .setTitle(`Surnom modifier`)
                .setDescription(
                    `${newUser}\nAncien surnom: ${oldNickname}\nNouveau surnom: ${newNickname}`,
                )
                .setFooter({ text: `ID: ${newUser.id}` })
                .setTimestamp();

            sendLogs(oldUser.client, oldUser.guild.id, embed);
        }
    },
};
