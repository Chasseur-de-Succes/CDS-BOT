module.exports = {
    TOKEN: "token_discord",
    STEAM_API_KEY: "steam_api_key", // https://steamcommunity.com/dev/apikey
    PREFIX: "$",
    VERSION: "0.1.0",
    DBCONNECTION: "mongodb://localhost:27017/test",
    DEV: [
        { name: "name1", id: "idDiscord1" },
        { name: "name2", id: "idDiscord2" },
        { name: "name3", id: "idDiscord3" }
    ],
    DEFAULTSETTINGS: { // a modifier/enlever ?
        logChannel: "logs",
        welcomeMessage: "welcome"
    }
}