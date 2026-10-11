const BaseRepository = require('./BaseRepository');
const { Tower, MessageClue, ClueField, TowerBoss } = require("../models/objection");

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
            .select("id", "season", "start")
            .where("guildId", guildId)
            .where("started", true)
            .first();
    }

    findByGuildIdAndSeason(guildId, season) {
        return this.Model.query()
            .where("guildId", guildId)
            .where("season", season)
            .where("started", true)
            .first();
    }

    findLatestByGuildId(guildId) {
        return this.Model.query()
            .where("guildId", guildId)
            .orderBy("season", "desc")
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

    findBoss(towerId, season, order) {
        return TowerBoss.query()
            .where("towerId", towerId)
            .where("season", season)
            .where("order", order)
            .first();
    }

    findAliveBoss(towerId, season) {
        return TowerBoss.query()
            .where("towerId", towerId)
            .where("season", season)
            .where("hp", ">", 0)
            .first();
    }

    findAliveBossBySeason(season) {
        return TowerBoss.query()
            .where("season", season)
            .where("hp", ">", 0)
            .first();
    }

    revealBoss(id) {
        return TowerBoss.query().findById(id).patch({ isDiscovered: true });
    }

    patchBoss(id, data) {
        return TowerBoss.query().findById(id).patch(data);
    }

    async isAllBossDead(season) {
        return await TowerBoss.query()
            .where("season", season)
            .where("hp", ">", 0)
            .resultSize() === 0;
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
    findMonthlyFields(msgClueId) {
        if (!msgClueId) return [];
        return ClueField.query()
            .select(
                "ClueField.id",
                "ClueField.name",
                "ClueField.value",
                "ClueField.type",
                "ClueField.found",
                "MessageClue.idMsg",
            )
            .join("MessageClue", "ClueField.idMsgClue", "MessageClue.id")
            .where("ClueField.idMsgClue", msgClueId)
            .orderBy("ClueField.value");
    }

    updateMessageClue(idMsgClue, data) {
        return MessageClue.query().findById(idMsgClue).patch(data);
    }
}

module.exports = new TowerRepository();