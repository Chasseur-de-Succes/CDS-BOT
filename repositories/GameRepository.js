const BaseRepository = require('./BaseRepository');
const { Game, Achievement } = require('../models/objection');

class GameRepository extends BaseRepository {
  constructor() {
    super(Game);
  }

  findByNameExactly(name) {
    return this.Model.query()
      .whereIn("type", ["game", "dlc"])
      .where('name', name)
      .limit(1);
  }

  findByName(name, limit = 25) {
    // On échappe les caractères spéciaux propres à SQL (LIKE/ILIKE)
    const escapedName = name?.replace(/[%_]/g, "\\$&");
    return this.Model.query()
      .whereIn("type", ["game", "dlc"])
      .where('name', 'ilike', `%${escapedName}%`)
      .limit(limit);
  }

  async findByAppid(appid) {
    return this.Model.query()
        .where("appid", appid)
        .first();
  }

  /**
   * Retourne la liste des appid présents en base PostgreSQL.
   */
  async getAppIds() {
    const rows = await this.Model.query()
      .distinct('appid');
    return rows.map((row) => row.appid);
  }

  /**
   * Retourne les appid des jeux dont le type n'est pas renseigné.
   */
  async getAppIdsWithoutType() {
    const rows = await this.Model.query()
        .distinct('appid')
      .whereNull('type');
    return rows.map((row) => row.appid);
  }

  /**
   * Upsert un jeu Steam et synchronise sa liste de succès.
   */
  async upsertFromSteam(data) {
    const {
      appid,
      name,
      type,
      iconHash,
      isMulti,
      isCoop,
      hasAchievements,
      isRemoved,
      achievements = [],
    } = data;

    return this.Model.transaction(async (trx) => {
      const game = await this.Model.query(trx)
        .insert({
          appid,
          name,
          type,
          iconHash,
          isMulti,
          isCoop,
          hasAchievements,
          isRemoved,
        })
        .onConflict('appid')
        .merge({
          name,
          type,
          iconHash,
          isMulti,
          isCoop,
          hasAchievements,
          isRemoved,
        });

      const uniqueAchievements = [];
      const uniqueByApiName = new Map();

      for (const achievement of achievements) {
        if (!achievement?.apiName) continue;
        uniqueByApiName.set(achievement.apiName, {
          appid,
          apiName: achievement.apiName,
          displayName: achievement.displayName || null,
          description: achievement.description || null,
          icon: extractFileNameFromUrl(achievement.icon) || null,
          icongray: extractFileNameFromUrl(achievement.icongray) || null,
        });
      }

      for (const achievement of uniqueByApiName.values()) {
        uniqueAchievements.push(achievement);
      }

      if (uniqueAchievements.length > 0) {
        await Achievement.query(trx)
          .insert(uniqueAchievements)
          .onConflict(['appid', 'apiName'])
          .merge({
            displayName: Achievement.ref('excluded.displayName'),
            description: Achievement.ref('excluded.description'),
            icon: Achievement.ref('excluded.icon'),
            icongray: Achievement.ref('excluded.icongray'),
          });

        await Achievement.query(trx)
          .delete()
          .where('appid', appid)
          .whereNotIn(
            'apiName',
            uniqueAchievements.map((achievement) => achievement.apiName),
          );
      } else {
        await Achievement.query(trx)
          .delete()
          .where('appid', appid);
      }

      return game;
    });
  }
}

const extractFileNameFromUrl = (value) => {
    if (value == null) return value;
    const str = String(value);
    const lastSlashIndex = str.lastIndexOf("/");
    return lastSlashIndex === -1 ? str : str.slice(lastSlashIndex + 1);
};

module.exports = new GameRepository();
