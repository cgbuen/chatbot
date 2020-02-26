const fs = require('fs')
const requestSpotify = require('../helpers/request-spotify')
const { TOKEN_STORE } = require('../vars')
const MSGS = {
  BROKEN_SPOTIFY: 'Out of service',
  NOT_PLAYING: 'No music playing'
}

module.exports = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const playingResponse = await requestSpotify.currentlyPlaying(fs.readFileSync(`./${TOKEN_STORE}/spotify-access`, 'utf8').trim())
  const playing = {}
  let msg
  if (playingResponse && playingResponse.error) {
    // if other error, just tell the user it's broken
    console.log(`==> Miscellaneous error: ${playingResponse.error}`)
    msg = MSGS.BROKEN_SPOTIFY

  } else if (playingResponse && playingResponse.is_playing && playingResponse.item && playingResponse.device) {
    // if you are playing something, display
    console.log('==> Song currently playing.')
    const artists = playing.artists = (playingResponse.item.artists && playingResponse.item.artists.map(item => item.name).join(', ')) || 'n/a'
    const title = playing.title = playingResponse.item.name || 'n/a'
    const album = playing.album = (playingResponse.item.album && playingResponse.item.album.name) || 'n/a'
    msg = `${artists} - ${title} [${album}]`

  } else if (playingResponse) {
    // if not playing anything, tell user you're not playing anything
    console.log(`==> No song currently playing.${playingResponse.noSession ? ' (No current session.)' : ''}`)
    msg = MSGS.NOT_PLAYING

  } else {
    // fallback
    console.log('==> playingResponse not provided.')
    msg = MSGS.BROKEN_SPOTIFY
  }
  playing.output_currentlyPlaying = `[Currently Playing] ${msg}`
  return res.send(playing)
}
