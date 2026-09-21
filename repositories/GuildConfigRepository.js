const BaseRepository = require('./BaseRepository');
const { GuildConfig } = require('../models/objection');
const { NEW_SALON } = require("../util/constants");

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
  };

  async getChannel(guildId, channel) {
    const result = await this.Model.query()
        .select(channel)
        .findOne({ guildId });

    // Si l'enregistrement existe, on renvoie la valeur de la colonne (ex: result['channelCatGroup'])
    return result ? result[channel] : null;
  }

  async setChannel(guildId, catConfig, channelId) {
    const column = NEW_SALON[catConfig];
    if (!column) {
      throw new Error(`Config salle inconnue : ${catConfig}`);
    }
    return this.upsertGuildConfig(guildId, { [column]: channelId });
  }
}

module.exports = new GuildConfigRepository();
