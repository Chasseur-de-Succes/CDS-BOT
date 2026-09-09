/**
 * Classe abstraite pour tous les repositories
 * Fournit les opérations CRUD de base
 */
class BaseRepository {
  constructor(Model) {
    this.Model = Model;
  }

  /**
   * Retourne tous les enregistrements
   */
  findAll() {
    return this.Model.query();
  }

  /**
   * Trouve un enregistrement par ID
   */
  findById(id) {
    return this.Model.query().findById(id);
  }

  /**
   * Crée un nouvel enregistrement
   */
  create(data) {
    return this.Model.query().insert(data);
  }

  /**
   * Crée plusieurs enregistrements en batch
   */
  createBatch(dataArray) {
    return this.Model.query().insert(dataArray);
  }

  /**
   * Met à jour un enregistrement
   */
  update(id, data) {
    return this.Model.query().findById(id).patch(data);
  }

  /**
   * Met à jour plusieurs enregistrements
   */
  updateBatch(updates) {
    return Promise.all(
      updates.map(({ id, data }) => this.update(id, data))
    );
  }

  /**
   * Supprime un enregistrement
   */
  delete(id) {
    return this.Model.query().deleteById(id);
  }

  /**
   * Supprime plusieurs enregistrements
   */
  deleteBatch(ids) {
    return this.Model.query().delete().whereIn('id', ids);
  }

  /**
   * Compte le nombre total d'enregistrements
   */
  count() {
    return this.Model.query().resultSize();
  }

  /**
   * Retourne avec pagination
   */
  paginate(page = 0, pageSize = 50) {
    return this.Model.query()
      .offset(page * pageSize)
      .limit(pageSize);
  }
}

module.exports = BaseRepository;
