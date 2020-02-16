const fs = require('fs')
const requestTwitch = require('../helpers/request-twitch')

module.exports = async (req, res) => {
  const subs = await requestTwitch.getAllStats(fs.readFileSync('./token-store/twitch-access', 'utf8').trim())
  return res.send(subs)
}
