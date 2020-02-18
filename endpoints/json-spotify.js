const fs = require('fs')
const requestSpotify = require('../helpers/request-spotify')
const { TOKEN_STORE } = require('../vars')

module.exports = async (req, res) => {
  const playingResponse = await requestSpotify.currentlyPlaying(fs.readFileSync(`./${TOKEN_STORE}/spotify-access`, 'utf8').trim())
  const playing = {
    artists: (playingResponse.item.artists && playingResponse.item.artists.map(item => item.name).join(', ')) || 'n/a',
    title: playingResponse.item.name || 'n/a',
    album: (playingResponse.item.album && playingResponse.item.album.name) || 'n/a'
  }
  return res.send(playing)
}
