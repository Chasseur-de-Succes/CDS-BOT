const { MESSAGES } = require("../../util/constants");
const { DEV, PREFIX } = require('../../config');
const { cross_mark } = require('../../data/emojis.json');
const { codeBlock } = require('@discordjs/builders');

module.exports.run = async (client, message, args) => {
    function clean(text) {
        if (typeof text === "string") 
            return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
        return text;
    }

    for (const i of DEV ) {
        //console.log(i.name + " : " + i.id);
        if(message.author.id == i.id) {
            devId = i.id;
            break;
        }
    }

    if (devId === message.author.id) {
        console.log(`\x1b[31m[WARN] \x1b[0m ${message.author.tag} a effectué la commande admin : ${MESSAGES.COMMANDS.ADMIN.EVAL.name}`)
        
        try {
            if(!args[0]) throw `Pas d'argument détecté ! Syntaxe correcte : \`${PREFIX}eval <code à exécuter>\``;

            const code = args.join(" ");
            const evaled = eval(code);
            const cleanCode = await clean(evaled);
            const msgCode = codeBlock('js', cleanCode);
            message.channel.send({content: msgCode});
        } catch (error) {
            message.channel.send(`${cross_mark} | Erreur : code non valide ! \n${error}`);
        }
        
    } else {
        message.react(cross_mark);
    }
    

}
module.exports.help = MESSAGES.COMMANDS.ADMIN.EVAL;