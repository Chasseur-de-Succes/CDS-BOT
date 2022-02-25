module.exports = {
    User: require('./user'),
    Group: require('./group'),
    Game: require('./game'),
    GuildConfig: require('./guildConfig'),
    Job: require('./jobs/job'),
    RolesChannel: require('./rolesChannel'),

    GameItem: require('./shop/gameItemShop'),
    CustomItem: require('./shop/customItemShop'),

    Msg: require('./hall/msg'),
    MsgHallHeros: require('./hall/hallHeros'),
    MsgHallZeros: require('./hall/hallZeros'),
}