const fs = require('fs')
const requestSpotify = require('../helpers/request-spotify')
const { TOKEN_STORE } = require('../vars')

module.exports = async (req, res) => {
  const playing = await requestSpotify.currentlyPlaying(fs.readFileSync(`./${TOKEN_STORE}/spotify-access`, 'utf8').trim())
  return res.send(playing)
}
