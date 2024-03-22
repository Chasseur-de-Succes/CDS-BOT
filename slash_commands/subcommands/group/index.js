const { editNbParticipant } = require("./nb-participant");
const { create } = require("./create");
const { schedule } = require("./session");
const { dissolve } = require("./dissolve");
const { transfert } = require("./transfert");
const { end } = require("./end");
const { kick } = require("./kick");
const { add } = require("./add");

module.exports = {
    create,
    schedule,
    dissolve,
    transfert,
    end,
    kick,
    editNbParticipant,
    add,
}