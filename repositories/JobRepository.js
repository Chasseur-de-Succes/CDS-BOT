const BaseRepository = require('./BaseRepository');
const { Job } = require("../models/objection");

class JobRepository extends BaseRepository {
    constructor() {
        super(Job);
    }

    findByName(name) {
        return this.Model.query()
            .where('name', name)
    }

    findPending() {
        return this.Model.query()
            .where('pending', true)
    }

    findObsolete() {
        return this.Model.query()
            .where('pending', false)
            .orWhere('when', '<=', new Date());
    }

}

module.exports = new JobRepository();