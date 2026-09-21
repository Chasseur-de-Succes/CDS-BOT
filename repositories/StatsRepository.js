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
   * Retourne les stats d'un utilisateur pour l'année courante
   */
  findCurrentYear(userId) {
    const currentYear = new Date().getFullYear();
    return this.Model.query()
      .where('userId', userId)
      .where('year', currentYear)
      .first();
  }

  /**
   * Retourne le total d'une stat sur toutes les années
   */
  findTotalStat(userId, field) {
    return this.Model.query()
      .where('userId', userId)
      .sum({ total: field })
      .first();
  }

  /**
   * Incrémente un compteur de stats d'un user sur l'année courante
   */
  async increment(userId, field, amount = 1) {
    const currentYear = new Date().getFullYear();

    const statsRow = await Stats.query()
        .where("userId", userId)
        .where("year", currentYear)
        .first();

    if (statsRow) {
      return this.Model.query().findById(statsRow.id).increment(field, amount);
    }
    return this.Model.query().insert({ userId, year: currentYear, [field]: amount });
  }

  /**
   * Incrémente le compteur de messages
   */
  async incrementMsgStat(userId) {
    return this.increment(userId, 'nbMsg', 1);
  }

  async incrementHero(userId) {
    return this.increment(userId, 'nbHero', 1);
  }
  async incrementZero(userId) {
    return this.increment(userId, 'nbZero', 1);
  }

  async incrementGroupCreated(userId) {
    return this.increment(userId, 'nbGroupCreated', 1);
  }
  async incrementGroupJoined(userId) {
    return this.increment(userId, 'nbGroupJoined', 1);
  }
  async incrementGroupLeft(userId) {
    return this.increment(userId, 'nbGroupLeft', 1);
  }
  async incrementGroupDissolved(userId) {
    return this.increment(userId, 'nbGroupDissolved', 1);
  }
  async incrementGroupEnded(userId) {
    return this.increment(userId, 'nbGroupEnded', 1);
  }
}

module.exports = new StatsRepository();
