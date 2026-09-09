const BaseRepository = require('./BaseRepository');
const { Observation } = require('../models/objection');

class ObservationRepository extends BaseRepository {
  constructor() {
    super(Observation);
  }

  /**
   * Retourne les observations d'un utilisateur
   */
  findByUserId(userId) {
    return this.Model.query()
      .where('userId', userId)
      .orderBy('createdAt', 'desc');
  }

  /**
   * Retourne les observations récentes
   */
  findRecent(limit = 50) {
    return this.Model.query()
      .orderBy('createdAt', 'desc')
      .limit(limit);
  }

  /**
   * Crée une observation
   */
  createObservation(userId, content) {
    return this.create({
      userId,
      content,
      createdAt: new Date(),
    });
  }
}

module.exports = new ObservationRepository();
