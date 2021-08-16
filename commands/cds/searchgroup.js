const { MessageEmbed } = require('discord.js');
const colors = require('../../data/colors.json');
const { MESSAGES } = require('../../util/constants');
const { PREFIX } = require('../../config.js');
//const { search } = require('superagent');

module.exports.run = (client, message, args) => {
    //console.log(args);
    if(!args[0]) {
        return message.channel.send(`Pour afficher l'aide de la commande: \`${PREFIX}${MESSAGES.COMMANDS.CDS.SEARCHGROUP.name} help\``);
    }
    else if(args[0] == "help") { // HELP
        const embed = new MessageEmbed()
            .setColor(colors.night)
            .setDescription(`Permet de rechercher et de rejoindre (ou quitter) un groupe pour un jeu multijoueur`)
            .addField("Commandes", `- ${PREFIX}searchgroup search <game name> : cherche un groupe pour le jeu souhaité
                \n- ${PREFIX}searchgroup list : affiche la liste des groupes rejoint
                \n- ${PREFIX}searchgroup join <name group> : rejoindre le groupe
                \n- ${PREFIX}searchgroup leave <name group> : quitter le groupe
                \n- ${PREFIX}searchgroup create <name group> <game name> : créé un groupe pour le jeu mentionné
                \n- ${PREFIX}searchgroup disolve <name group> : dissout le groupe mentionné (capitaine du groupe uniquement)
                \n- ${PREFIX}searchgroup transfert <name group> <mention user> : transfert le statut capitaine du groupe à la personne mentionné`)
            .addField('Règles du nom de groupe', `- Ne peut contenir que des lettres [a ➔ z], des chiffres [0 ➔ 9] ou des caractères spéciaux : "-", "_", "&"
                - Le nom possède minimum 3 caractères et au maximum 15 caractères`);

        return message.channel.send(embed);
    }
    else if(args[0] == "list") { // LIST
        // afficher liste des groupes rejoints (+ préciser quand capitaine du groupe)
    }
    else if(args[0] == "join") { // JOIN
        //REJOINT LE GROUPE SI IL RESTE ENCORE UNE PLACE
    }
    else if(args[0] == "leave") { // LEAVE
        //QUITTE LE GROUPE
    }
    else if(args[0] == "create") { // Créer groupe
        //CREE GROUPE
    }
    else if(args[0] == "disolve") { // Dissout groupe
        //DISSOUT LE GROUPE SI IL EST CAPITAINE
    }
    else if(args[0] == "transfert") { // Transfert le statut capitaine à un autre membre du groupe
        //TRANSFERT LE STATUT CAPITAINE A UN AUTRE MEMBRE DU GROUPE (VERIFIER S'IL EST CAPITAINE)
    }
    else {
        return message.channel.send(`Commande non valide, référez-vous à la commande d'aide : \`${PREFIX}${MESSAGES.COMMANDS.CDS.SEARCHGROUP.name} help\``);
    }
}

module.exports.help = MESSAGES.COMMANDS.CDS.SEARCHGROUP;