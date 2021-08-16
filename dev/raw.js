const axios = require('axios');

module.exports = async e => {
    if(e.t === 'INTERACTION_CREATE'){
        const url = `https://discord.com/api/v8/interactions/${e.d.id}/${e.d.token}/callback`;
        const body = {
            "type": 4,
            "data": {
                content: "test"
            }
        }
        const data = await axios.post(url, body, null);
        console.log(data);
    }
}