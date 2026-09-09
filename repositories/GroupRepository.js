const BaseRepository = require('./BaseRepository');
const { Group } = require('../models/objection');

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
      .withGraphFetched('[captain, members, groupLinks]');
  }

  /**
   * Cherche les groupes par nom
   */
  findByName(name) {
    return this.Model.query()
      .where('name', 'like', `%${name}%`);
  }

  /**
   * Retourne les groupes d'un capitaine
   */
  findByCaptain(captainId) {
    return this.Model.query()
      .where('captain', captainId)
      .withGraphFetched('[members]');
  }

  /**
   * Trouve les groupes d'un utilisateur ayant un événement sur une journée donnée.
   * Équivalent PostgreSQL de:
   * Group.where("dateEvent").gte(start).lte(end).where("members").in(user).populate("game")
   */
  findByEventDateAndMember(date, dbUser, guildId = null) {
    const { GroupUser } = require('../models/objection');
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
  createGroup(data) {
    const {
      name,
      captain,
      description = null,
      createdAt = new Date(),
      updatedAt = new Date(),
    } = data;

    return this.Model.query().insert({
      name,
      captain,
      description,
      createdAt,
      updatedAt,
    });
  }

  /**
   * Ajoute un utilisateur au groupe via GroupUser
   */
  async addMember(groupId, userId) {
    const { GroupUser } = require('../models/objection');
    return GroupUser.query().insert({
      groupid: groupId,
      userid: userId,
    });
  }

  /**
   * Retire un utilisateur du groupe
   */
  async removeMember(groupId, userId) {
    const { GroupUser } = require('../models/objection');
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
      .withGraphFetched('members');
  }

  /**
   * Retourne le nombre de membres
   */
  async getMemberCount(groupId) {
    const { GroupUser } = require('../models/objection');
    const result = await GroupUser.query()
      .where('groupid', groupId)
      .resultSize();
    return result;
  }

  /**
   * Supprime un groupe et ses associations
   */
  async deleteGroupFull(groupId) {
    const { GroupUser } = require('../models/objection');
    await GroupUser.query()
      .delete()
      .where('groupid', groupId);
    return this.delete(groupId);
  }
}

module.exports = new GroupRepository();
