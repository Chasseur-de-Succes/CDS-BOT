const { MESSAGES } = require("../../util/constants");
const { dissolve } = require('../cds/group');

module.exports.run = async (client, message, args) => {
    dissolve(client, message, args[0], true);
}

module.exports.help = MESSAGES.COMMANDS.ADMIN.DISSOLVEGROUP;
