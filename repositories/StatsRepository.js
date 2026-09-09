const BaseRepository = require('./BaseRepository');
const { Stats } = require('../models/objection');

class StatsRepository extends BaseRepository {
  constructor() {
    super(Stats);
  }

  /**
   * Retourne les stats d'un utilisateur
   */
  findByUserId(userId) {
    return this.Model.query()
      .where('userId', userId);
  }

  /**
   * Crée ou met à jour les stats d'un utilisateur pour une partie
   */
  async upsertStats(userId, gameId, data) {
    const existing = await this.Model.query()
      .where('userId', userId)
      .where('gameId', gameId)
      .first();

    if (existing) {
      return this.update(existing.id, data);
    }
    return this.create({
      userId,
      gameId,
      ...data,
    });
  }

  /**
   * Incrémente un compteur de stats
   */
  increment(statsId, field, amount = 1) {
    return this.Model.query()
      .findById(statsId)
      .increment(field, amount);
  }
}

module.exports = new StatsRepository();
