const { MessageEmbed, Permissions } = require('discord.js');

const { MESSAGES } = require("../../util/constants");
const { CHECK_MARK, CROSS_MARK } = require('../../data/emojis.json');
const { DARK_RED} = require("../../data/colors.json");
const { editMsgHubGroup } = require('../../util/msg/group');
const { run } = require('../misc/register');

module.exports.run = async (client, message, args) => {
    try {
        // -- test si user a le droit de gérer les messages (admin)
        if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) 
            throw `Interdiction.`;
        
        let memberToBlacklist = message.mentions.members.first();
        let memberToBlacklistId = memberToBlacklist ? memberToBlacklist.id : args.slice(0).join("");
    
        if (!memberToBlacklistId) 
            return message.reply('Veuillez spécifier un membre ou son ID.');

        // maj attribut blacklisted
        let user = await client.findUserById(memberToBlacklistId);
        if (!user) {
            // TODO on créé l'user pour pouvoir le blacklisté
            logger.warn(".. utilisateur non enregistré, on l'enregistre pour pouvoir le blacklister");
            
            user = await client.createUser({
                userId: memberToBlacklistId,
                username: memberToBlacklist.user.tag
            });
        }

        await client.updateUser(user, { blacklisted: true });

        // TODO le kick de tous les groupes ?
        // TODO et s'il est capitaine ?
        // TODO empecher l'execution d'autre commande si blacklsité

        // update msg TODO
        // await editMsgHubGroup(client, grp);
        logger.info(memberToBlacklist.user.tag + "a été blacklisté");
        message.react(CHECK_MARK)
    } catch (err) {
        const embedError = new MessageEmbed()
            .setColor(DARK_RED)
            .setTitle(`${CROSS_MARK} ${err}`);
        logger.error("Erreur leavegroup " + args[0] + ":" + err);
        return message.channel.send({ embeds: [embedError] });
    }
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.BLACKLISTUSER;
