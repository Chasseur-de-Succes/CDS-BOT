const BaseRepository = require('./BaseRepository');
const { GuildConfig } = require('../models/objection');

class GuildConfigRepository extends BaseRepository {
  constructor() {
    super(GuildConfig);
  }

  /**
   * Retourne la config d'une guild
   */
  findByGuildId(guildId) {
    return this.Model.query()
      .where('guildId', guildId)
      .first();
  }

  /**
   * Alias générique pour harmoniser les appels repository
   */
  async upsert(guildId, data) {
    return this.upsertGuildConfig(guildId, data);
  }

  /**
   * Crée ou met à jour la config d'une guild
   */
  async upsertGuildConfig(guildId, data) {
    const existing = await this.findByGuildId(guildId);

    if (existing) {
      return this.update(existing.guildId, data);
    }
    return this.create({
      guildId,
      ...data,
    });
  }
}

module.exports = new GuildConfigRepository();
