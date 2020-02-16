const fs = require('fs')
const requestTwitch = require('../helpers/request-twitch')
const { TOKEN_STORE } = require('../vars')

module.exports = async (req, res) => {
  const subs = await requestTwitch.getAllStats(fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
  return res.send(subs)
}
