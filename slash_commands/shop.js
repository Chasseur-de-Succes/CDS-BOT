const { SlashCommandBuilder } = require('discord.js');
const customItems = require("../data/customShop.json");
const { User, Game } = require('../models');
const { escapeRegExp, getJSONValue } = require('../util/util');
const { jeux, list, custom, sell } = require("./subcommands/shop")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Affiche la boutique")
        .setDMPermission(false)
        .addSubcommand(sub =>
            sub
                .setName("list")
                .setDescription("Liste les jeux achetable"))
        .addSubcommand(sub =>
            sub
                .setName("jeux")
                .setDescription("Ouvre le shop (Jeux)")
                .addIntegerOption(option => option.setName("page").setDescription("N° de page du shop")))
        .addSubcommand(sub =>
            sub
                .setName("custom")
                .setDescription("Ouvre le shop (personnalisation)")
                .addStringOption(option => option.setName("type").setDescription("Type d'item").setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub =>
            sub
                .setName("sell")
                .setDescription("Vend une clé Steam")
                .addStringOption(option => option.setName("jeu").setDescription("Nom du jeu").setRequired(true).setAutocomplete(true))
                .addIntegerOption(option => option.setName("prix").setDescription(`Prix du jeu (en ${process.env.MONEY})`).setRequired(true)))
        ,
    async autocomplete(interaction) {
        if (interaction.commandName === "shop") {
            if (interaction.options.getSubcommand() === "custom") {
                let filtered = [];
                for (let x in customItems) {
                    filtered.push({
                        name: customItems[x].title,
                        // description: 'Description',
                        value: "" + x
                    });
                }
                
                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.value })),
                );
            } else if (interaction.options.getSubcommand() === "sell") {
                const focusedValue = interaction.options.getFocused(true);
                let filtered = [];
                let exact = [];
    
                // cmd group create, autocomplete sur nom jeu
                if (focusedValue.name === "jeu") {
                    // recherche nom exacte
                    exact = await interaction.client.findGames({
                        name: focusedValue.value,
                        type: "game"
                    });
    
                    // recup limit de 25 jeux, correspondant a la value rentré
                    filtered = await Game.aggregate([{
                        $match: { name: new RegExp(escapeRegExp(focusedValue.value), "i") }
                    }, {
                        $match: { type: "game" }
                    }, {
                        $limit: 25
                    }])
    
                    // filtre nom jeu existant ET != du jeu exact trouvé (pour éviter doublon)
                    // limit au 25 premiers
                    // si nom jeu dépasse limite imposé par Discord (100 char)
                    // + on prepare le résultat en tableau de {name: '', value: ''}
                    filtered = filtered
                        .filter(jeu => jeu.name && jeu.name !== exact[0]?.name)
                        .slice(0, 25)
                        .map(element => ({
                            name: element.name?.length > 100 ? element.name.substr(0, 96) + '...' : element.name,
                            value: "" + element.appid
                        }));
                }
    
                // si nom exact trouvé
                if (exact.length === 1) {
                    const jeuExact = exact[0]
                    // on récupère les 24 premiers
                    filtered = filtered.slice(0, 24);
                    // et on ajoute en 1er l'exact
                    filtered.unshift({ name: jeuExact.name, value: "" + jeuExact.appid })
                }
    
                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.value })),
                );
            }
        }
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "list") {
            list(interaction, interaction.options);
        } else if (subcommand === "jeux") {
            jeux(interaction, interaction.options, true);
        } else if (subcommand === "custom") {
            custom(interaction, interaction.options);
        } else if (subcommand === "sell") {
            sell(interaction, interaction.options)
        }
    },
}