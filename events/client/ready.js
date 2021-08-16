require('date.format');
const {VERSION} = require('../../config.js');

module.exports = client => {
    const date = new Date();
    console.log(`Logged in as ${client.user.tag}! Version: ${VERSION}. On ${date.format("{MM}/{DD}/{Y} at {hh}:{mm}:{ss}")}.`);
    client.user.setActivity(`faire un 100% | v${VERSION}`, {type: 'PLAYING'});
}