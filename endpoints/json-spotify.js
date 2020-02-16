const fs = require('fs')
const requestSpotify = require('../helpers/request-spotify')

module.exports = async (req, res) => {
  const playing = await requestSpotify.currentlyPlaying(fs.readFileSync('./token-store/spotify-access', 'utf8').trim())
  return res.send(playing)
}
