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
      .orderBy('date', 'desc');
  }

  /**
   * Retourne les observations récentes
   */
  findRecent(limit = 50) {
    return this.Model.query()
      .orderBy('date', 'desc')
      .limit(limit);
  }

  /**
   * Retourne toutes les observations, groupé par l'utilisateur et avec le nombre total
   */
  findAllGroupedByUser() {
    return this.Model.query()
      .select('userId')
      .count('id as total')
      .groupBy('userId');
  }

  /**
   * Crée une observation
   */
  create(userId, reporterId, reason) {
    logger.info('[DB] Nouvelle note d\'observation créée', userId, reporterId);
    return super.create({
      userId,
      reporterId,
      reason,
      date: new Date(),
    });
  }
}

module.exports = new ObservationRepository();
