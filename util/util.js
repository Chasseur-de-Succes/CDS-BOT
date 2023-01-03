module.exports.escapeRegExp = (string) => {
    return string?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

module.exports.monthDiff = (d1, d2) => {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
}

module.exports.daysDiff = (d1, d2) => {
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 0 ? 0 : diffDays;
}

  // recup la valeur d'un chemin dans un JSON
  // ex: path = 'img.heros' dans { img: {heros: 1} } retourne '1'
module.exports.getJSONValue = (model, path, def) => {
    path = path || '';
    model = model || {};
    def = typeof def === 'undefined' ? '' : def;
    var parts = path.split('.');
    if (parts.length > 1 && typeof model[parts[0]] === 'object') {
        return this.getJSONValue(model[parts[0]], parts.splice(1).join('.'), def);
    } else {
        return model[parts[0]] || def;
    }
}