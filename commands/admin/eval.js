const { MESSAGES } = require("../../util/constants");
const { DEV } = require('../../config');
const { CROSS_MARK } = require('../../data/emojis.json');
const { codeBlock } = require('@discordjs/builders');

module.exports.run = async (client, message, args) => {
    function clean(text) {
        if (typeof text === "string") 
            return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
        return text;
    }

    for (const i of DEV ) {
        //console.log(i.name + " : " + i.id);
        if (message.author.id == i.id) {
            devId = i.id;
            break;
        }
    }

    if (devId === message.author.id) {
        logger.warn(message.author.tag+" a effectué la commande admin : "+MESSAGES.COMMANDS.ADMIN.EVAL.name)
        
        try {
            if(!args[0]) throw `Pas d'argument détecté ! Syntaxe correcte : \`${process.env.PREFIX}eval <code à exécuter>\``;

            const code = args.join(" ");
            const evaled = eval(code);
            const cleanCode = await clean(evaled);
            const msgCode = codeBlock('js', cleanCode);
            message.channel.send({content: msgCode});
        } catch (error) {
            message.channel.send(`${CROSS_MARK} | Erreur : code non valide ! \n${error}`);
        }
        
    } else {
        message.react(CROSS_MARK);
    }
    

}
module.exports.help = MESSAGES.COMMANDS.ADMIN.EVAL;