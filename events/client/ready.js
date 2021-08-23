require('date.format');
const {VERSION} = require('../../config.js');

module.exports = client => {
    const date = new Date();
    console.log(`\x1b[32mLogged in as ${client.user.tag}! Version: ${VERSION}. On ${date.format("{MM}/{DD}/{Y} at {hh}:{mm}:{ss}")}.\x1b[0m`);
    //client.user.setActivity(`faire un 100% | v${VERSION}`, {type: 'PLAYING'});
    client.user.setPresence({activities: [{ name: `faire un 100% | v${VERSION}` }] });
}