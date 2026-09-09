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
   * Crée ou met à jour la config d'une guild
   */
  async upsertGuildConfig(guildId, data) {
    const existing = await this.findByGuildId(guildId);

    if (existing) {
      return this.update(existing.id, data);
    }
    return this.create({
      guildId,
      ...data,
    });
  }
}

module.exports = new GuildConfigRepository();
