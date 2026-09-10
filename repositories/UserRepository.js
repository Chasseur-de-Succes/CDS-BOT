const BaseRepository = require('./BaseRepository');
const { User } = require("../models/objection");

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Trouve un utilisateur par son User Discord
   */
  findByDiscordUser(user) {
    return this.findByDiscordId(user?.id);
  }
  /**
   * Trouve un utilisateur par son ID Discord
   */
  findByDiscordId(discordId) {
    return this.Model.query()
      .where('discordId', discordId)
      .first();
  }

  /**
   * Trouve un utilisateur par Discord ID avec relations eager-loaded
   */
  findByDiscordIdWithRelations(discordId) {
    return this.Model.query()
      .where('discordId', discordId)
      .withGraphFetched('[stats, captainedGroups, groupLinks, towerStats, achievementTiers]')
      .first();
  }

  /**
   * Trouve un utilisateur par Steam ID
   */
  findBySteamId(steamId) {
    return this.Model.query()
      .where('steamId', steamId)
      .first();
  }

  /**
   * Trouve tous les utilisateurs bannis
   */
  findAllBanned() {
    return this.Model.query()
      .where('banned', true);
  }

  /**
   * Trouve tous les utilisateurs blacklistés
   */
  findAllBlacklisted() {
    return this.Model.query()
      .where('blacklisted', true);
  }

  /**
   * Crée un nouvel utilisateur avec les valeurs par défaut
   */
  createWithDefaults(discordId, username = null, steamId = null) {
    return this.Model.query().insert({
      discordId,
      username,
      steamId,
      xp: 0,
      level: 1,
      money: 0,
      banned: false,
      blacklisted: false,
      moneyLimit: 0,
      nbWarning: 0,
    });
  }

  /**
   * Incrémente l'XP d'un utilisateur
   */
  addXp(userId, amount) {
    return this.Model.query()
      .findById(userId)
      .increment('xp', amount);
  }

  /**
   * Augmente le level d'un utilisateur
   */
  incrementLevel(userId) {
    return this.Model.query()
      .findById(userId)
      .increment('level', 1);
  }

  /**
   * Ajoute de l'argent
   */
  addMoney(userId, amount) {
    return this.Model.query()
      .findById(userId)
      .increment('money', amount);
  }
  addMoneyLimit(userId, amount) {
    return this.Model.query()
      .findById(userId)
      .increment('moneyLimit', amount);
  }

  /**
   * Retire de l'argent
   */
  subtractMoney(userId, amount) {
    return this.Model.query()
      .findById(userId)
      .decrement('money', amount);
  }

  /**
   * Ajoute un warning
   */
  addWarning(userId) {
    return this.Model.query()
      .findById(userId)
      .increment('nbWarning', 1);
  }

  /**
   * Ban un utilisateur
   */
  ban(userId) {
    return this.update(userId, { banned: true });
  }

  /**
   * Unban un utilisateur
   */
  unban(userId) {
    return this.update(userId, { banned: false });
  }

  /**
   * Blacklist un utilisateur
   */
  blacklist(userId) {
    return this.update(userId, { blacklisted: true });
  }

  /**
   * Retire de la blacklist
   */
  removeBlacklist(userId) {
    return this.update(userId, { blacklisted: false });
  }

  /**
   * Cherche par username (LIKE)
   */
  findByUsername(username) {
    return this.Model.query()
      .where('username', 'like', `%${username}%`);
  }

  /**
   * Retourne les utilisateurs avec le plus d'XP
   */
  findTopByXp(limit = 10) {
    return this.Model.query()
      .orderBy('xp', 'desc')
      .limit(limit);
  }

  /**
   * Retourne les utilisateurs avec le plus d'argent
   */
  findTopByMoney(limit = 10) {
    return this.Model.query()
      .orderBy('money', 'desc')
      .limit(limit);
  }
}

module.exports = new UserRepository();
