const BaseRepository = require('./BaseRepository');
const { Tower, MessageClue, ClueField, TowerStats, TowerBoss } = require("../models/objection");

class TowerRepository extends BaseRepository {
    constructor() {
        super(Tower);
    }

    findByGuildIdAndStarted(guildId) {
        return this.Model.query()
            .where("guildId", guildId)
            .where("started", true)
            .withGraphFetched('messageClue')
            .first();
    }

    findCurrentSeason(guildId) {
        return this.Model.query()
            .select("id", "season")
            .where("guildId", guildId)
            .where("started", true)
            .first();
    }

    /* Boss */
    findCurrentBoss(towerId, season) {
        return TowerBoss.query()
            .where("towerId", towerId)
            .where("season", season)
            .where("hp", ">", 0)
            .where('isDiscovered', true)
            .orderBy("order")
            .first();
    }

    /* Clue Field && Message Clue*/
    findCurrentClue(month) {
        return MessageClue.query()
            .where("month", month)
            .first();
    }
    findClueFields(id) {
        return ClueField.query()
            .where("idMsgClue", id)
    }
    updateMessageClue(idMsgClue, data) {
        return MessageClue.query().findById(idMsgClue).patch(data);
    }
}

module.exports = new TowerRepository();