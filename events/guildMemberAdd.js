const { CORNFLOWER_BLUE } = require("../data/colors.json");
const { EmbedBuilder, Events } = require("discord.js");
const { sendLogs } = require("../util/envoiMsg");
const { CDS } = require("../data/emojis.json");

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const user = member.user;
        const embed = new EmbedBuilder()
            .setColor(CORNFLOWER_BLUE)
            .setTitle(`Nouveau membre`)
            .setDescription(member.toString())
            .addFields(
                {
                    name: "Âge du compte",
                    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                },
                { name: "ID", value: `${member.id}` },
            );

        // Nouveau
        const nouveau = member.guild.roles.cache.find(
            (r) => r.name === "Nouveau",
        );
        if (nouveau) await member.roles.add(nouveau);

        // recup "a-lire"
        let alire = member.client.channels.cache.find(
            (r) => r.name === "💬a-lire",
        );
        // recup "bienvenue"
        let bienvenue = member.guild.systemChannel;

        if (alire && bienvenue) {
            let msgBienvenue = `> Bienvenue à toi ${user}, tu trouveras ici d'autres chasseurs de succès francophones ! ${CDS}
> Si tu veux accéder au reste du Discord, c'est par ici ➡️ ${alire}
> On espére te voir participer à la vie du groupe, et tu verras, ensemble, la chasse aux succès est encore plus amusante !`;

            await member.client.channels.cache
                .get(bienvenue.id)
                .send(msgBienvenue);
        }

        sendLogs(member.client, member.guild.id, embed);
    },
};
