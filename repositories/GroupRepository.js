const BaseRepository = require('./BaseRepository');
const { Group, GroupUser } = require('../models/objection');

class GroupRepository extends BaseRepository {
  constructor() {
    super(Group);
  }

  /**
   * Trouve un groupe avec ses relations
   */
  findByIdWithRelations(id) {
    return this.Model.query()
        .findById(id)
        .withGraphFetched('[captainUser, members, gameInfo]');
  }

  /**
   * Trouve tous les groupes, avec ses relations
   */
  findAllWithRelations() {
    return this.Model.query()
        .whereNull('validated')
        .withGraphFetched('[captainUser, members, gameInfo]');
  }
  /**
   * Trouve tous les groupes, en cours (avec un id msg), avec ses relations
   */
  findAllInProgressWithRelations() {
    return this.Model.query()
        .whereNotNull('idMsg')
        .withGraphFetched('[captainUser, members, gameInfo]');
  }

  /**
   * Cherche les groupes par nom
   */
  findByNameAndGuildId(name, guildId) {
    const escapedName = name?.replace(/[%_]/g, "\\$&");
    return this.Model.query()
        .where('name', 'ilike', `%${escapedName}%`)
        .where('guildId', guildId)
        .whereNull('validated');
  }

  /**
   * Retourne les groupes d'un capitaine
   */
  findByCaptain(captainId) {
    return this.Model.query()
      .where('captain', captainId)
      .whereNull('validated')
      .withGraphFetched('[members]');
  }

  /**
   * Trouve les groupes d'un utilisateur ayant un événement sur une journée donnée.
   * Équivalent PostgreSQL de:
   * Group.where("dateEvent").gte(start).lte(end).where("members").in(user).populate("game")
   */
  findByEventDateAndMember(date, dbUser, guildId = null) {
    const userId = typeof dbUser === 'object' ? dbUser?.id : dbUser;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return this.Model.query()
      .withGraphFetched('gameInfo')
      .modify((qb) => {
        if (guildId) {
          qb.where('guildId', guildId);
        }
      })
      .whereExists(
        GroupUser.query()
          .select(1)
          .whereColumn('GroupUser.groupid', 'Group.id')
          .where('GroupUser.userid', userId),
      )
      .whereRaw(
        `EXISTS (
          SELECT 1
          FROM unnest("Group"."dates") AS date_event
          WHERE date_event >= ? AND date_event <= ?
        )`,
        [dayStart, dayEnd],
      );
  }

  /**
   * Crée un nouveau groupe
   */
  async createGroup(data) {
    const { guildId, name, desc, nbMax, captain, members = [], game, channelId } = data;
    const captainId = captain?.id ?? captain;
    const gameAppid = game?.appid ?? game ?? null;

    return await this.Model.transaction(async (trx) => {
      // 1. Insertion du groupe
      const grp = await this.Model.query(trx).insertAndFetch({
        guildId,
        name,
        desc,
        nbMax,
        captain: captainId,
        game: gameAppid,
        channelId,
        dateCreated: new Date(),
      });

      // 2. Insertion des membres dans la table de jonction
      const memberIds = members.map((m) => m?.id ?? m);
      if (memberIds.length > 0) {
        await GroupUser.query(trx).insert(
            memberIds.map((userId) => ({ groupid: grp.id, userid: userId }))
        );
      }

      // 3. On recharge le groupe avec sa relation
      return await this.Model.query(trx)
          .findById(grp.id)
          .withGraphFetched('[captainUser, members, gameInfo]');
    });
  }

  /**
   * Ajoute un utilisateur au groupe via GroupUser
   */
  async addMember(groupId, userId) {
    return GroupUser.query().insert({
      groupid: groupId,
      userid: userId,
    });
  }

  /**
   * Retire un utilisateur du groupe
   */
  async removeMember(groupId, userId) {
    return GroupUser.query()
      .delete()
      .where('groupid', groupId)
      .where('userid', userId);
  }

  /**
   * Retourne les membres d'un groupe
   */
  getMembers(groupId) {
    return this.Model.query()
      .findById(groupId)
      .whereNull('validated')
      .withGraphFetched('members');
  }

  /**
   * Retourne le nombre de membres
   */
  async getMemberCount(groupId) {
    return await GroupUser.query()
        .where('groupid', groupId)
        .resultSize();
  }

  /**
   * Supprime un groupe et ses associations
   */
  async deleteGroupFull(groupId) {
    await GroupUser.query()
      .delete()
      .where('groupid', groupId);
    return this.delete(groupId);
  }

  async countOngoingByMember(userDb) {
    return this.Model.query()
        .whereExists(
            GroupUser.query()
                .select(1)
                .whereColumn('GroupUser.groupid', 'Group.id')
                .where('GroupUser.userid', userDb.id),
        )
        .whereNull('validated')
        .resultSize();
  }

  async existsByName(name) {
    const result = await this.Model.query()
        .select('id')
        .where('name', name)
        .whereNull('validated')
        .first();
    return Boolean(result);
  }
}

module.exports = new GroupRepository();
