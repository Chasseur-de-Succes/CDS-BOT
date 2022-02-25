const mongoose = require('mongoose');

const jobSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: String,       // nom du job, unique
    when: Date,         // quand le job doit être exécuté
    what: String,       // nom de la fonction
    args: [String],     // arguments pour la fonction
    pending: {
        "type": Boolean,
        "default": true // si false, alors job terminé
    },
})

module.exports = mongoose.model("Job", jobSchema);