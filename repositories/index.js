/**
 * Exporte centralisés de tous les repositories
 * Permet un import simple: const { UserRepository, GroupRepository } = require('../repositories')
 */

module.exports = {
  BaseRepository: require('./BaseRepository'),
  UserRepository: require('./UserRepository'),
  GroupRepository: require('./GroupRepository'),
  GameRepository: require('./GameRepository'),
  StatsRepository: require('./StatsRepository'),
  GuildConfigRepository: require('./GuildConfigRepository'),
  ObservationRepository: require('./ObservationRepository'),
  MetaAchRepository: require('./MetaAchievementRepository'),
  JobRepository: require('./JobRepository'),
  TowerRepository: require('./TowerRepository'),
};
