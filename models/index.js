module.exports = {
    User: require("./user"),
    Group: require("./group"),
    Game: require("./game"),
    GuildConfig: require("./guildConfig"),
    Job: require("./jobs/job"),
    RolesChannel: require("./rolesChannel"),
    CheatSuspicions: require("./cheatSuspicions"),

    GameItem: require("./shop/gameItemShop"),
    CustomItem: require("./shop/customItemShop"),

    Msg: require("./msgChannel/msg"),
    MsgDmdeAide: require("./msgChannel/demandeAide"),
    MsgHallHeros: require("./msgChannel/hallHeros"),
    MsgHallZeros: require("./msgChannel/hallZeros"),

    TowerBoss: require("./event/towerBoss"),
};
