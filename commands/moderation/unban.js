const colors = require('../../data/colors.json');
const { MESSAGES } = require('../../util/constants');
const { Permissions } = require('discord.js');

module.exports.run = (client, message, args) => {
    // -- test si user a le droit de ban
    if (!message.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) return message.reply("Tu n'as pas le droit de unban !")

    let userToUnbanId = args.slice(0).join("");

    if (!userToUnbanId) 
        return message.reply('Veuillez spécifier l\'ID du membre à unban.');
    else {
        // si user est ban
        message.guild.bans.fetch(userToUnbanId)
        .then(user => {
            // on le retire des bannis
            message.guild.members.unban(userToUnbanId)
            .then(async user => {
                console.log(`\x1b[34m[INFO] \x1b[0mUnban ${user.username}`);
                message.reply(`> Utilisateur ${user.username} unban ! ☑️ `);

                // maj attribut 'banned'
                let userBD = await client.getUser(user);
                await client.update(userBD, {banned: false})
            })
            .catch(err => {
                console.log(`\x1b[31m[ERROR] \x1b[0mErreur unban : ` + err);
                message.reply('> Erreur lors de l\'unban.')
            });
        })
        .catch(err => {
            message.reply('> ' + userToUnbanId + ' n\'est pas banni sur ce serveur !')
        });
    }
}

module.exports.help = MESSAGES.COMMANDS.MODERATION.UNBAN;