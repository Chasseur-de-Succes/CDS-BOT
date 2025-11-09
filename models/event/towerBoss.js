const mongoose = require("mongoose");

const bossSchema = new mongoose.Schema({
    name: { type: String, required: true },
    hp: { type: Number, default: 50 },
    maxHp: { type: Number, default: 50 },
    season: { type: Number, default: 0 }, // Indique à quelle saison ce boss appartient
    hidden: { type: Boolean, default: false },
    ordre: { type: Number, default: 0 }, // Ordre d'apparition du boss dans la saison (si défini)
    killedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("TowerBoss", bossSchema);
