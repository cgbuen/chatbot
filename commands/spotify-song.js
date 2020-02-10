const requestSpotify = require('../request-spotify')

const COUNT_RETRIES = 3
const MSGS = {
  BROKEN_SPOTIFY: 'chatbot/spotify integration is broken lmao',
  NOT_PLAYING: 'i\'m not playing anything on spotify rn'
}

module.exports = async function song({ chat, spotifyTokenData }) {
  let accessToken = spotifyTokenData.access_token
  let refreshToken = spotifyTokenData.refresh_token

  const handleMessaging = async (currentlyPlayingData, options) => {
    // handle messaging based off of the currentlyPlayingData provided by
    // spotify. calls self in the case that access token expires.

    if (!options.retries) {
      // if too many refresh attempts or attempts not specified, just tell the
      // user it's broken
      console.log('==> Too many refresh attempts.')
      const msg = MSGS.BROKEN_SPOTIFY
      return msg

    } else if (currentlyPlayingData && currentlyPlayingData.error && currentlyPlayingData.error.message && currentlyPlayingData.error.message.includes('xpire')) {
      // if expired error, retry using refresh token. recursively call,
      // terminated either by successful access token usage (leading to correct
      // messaging outside of this condition) or by retry threshold (specified
      // in options object).
      console.log(`==> Expiration error: ${currentlyPlayingData.error.message}. Retrying.`)
      const spotifyTokenDataUpdated = await requestSpotify.refresh(refreshToken)
      accessToken = spotifyTokenDataUpdated.access_token // update access token
      refreshToken = spotifyTokenDataUpdated.refresh_token || refreshToken // update refresh token *if available*
      const spotifyCurrentlyPlayingData = await requestSpotify.currentlyPlaying(accessToken) // try again now that tokens are updated
      return handleMessaging(spotifyCurrentlyPlayingData, { retries: options.retries - 1 }) // recursively call

    } else if (currentlyPlayingData && currentlyPlayingData.error) {
      // if other error, just tell the user it's broken
      console.log(`==> Miscellaneous error: ${currentlyPlayingData.error}`)
      const msg = MSGS.BROKEN_SPOTIFY
      return msg

    } else if (currentlyPlayingData && currentlyPlayingData.is_playing && currentlyPlayingData.item && currentlyPlayingData.device) {
      // if you are playing something, display
      console.log('==> Song currently playing.')
      const artists = (currentlyPlayingData.item.artists && currentlyPlayingData.item.artists.map(item => item.name).join(', ')) || 'n/a'
      const title = currentlyPlayingData.item.name || 'n/a'
      const album = (currentlyPlayingData.item.album && currentlyPlayingData.item.album.name) || 'n/a'
      // const device = currentlyPlayingData.device.name
      const msg = `${artists} - ${title} [${album}]`
      return msg

    } else if (currentlyPlayingData) {
      // if not playing anything, tell user you're not playing anything
      console.log(`==> No song currently playing.${currentlyPlayingData.noSession ? ' (No current session.)' : ''}`)
      const msg = MSGS.NOT_PLAYING
      return msg

    } else {
      // fallback, e.g. if data wasn't ever even put into function, tell user
      // it's broken
      console.log('==> currentlyPlayingData not provided.')
      const msg = MSGS.BROKEN_SPOTIFY
      return msg
    }
  }

  const spotifyCurrentlyPlayingData = await requestSpotify.currentlyPlaying(accessToken)
  return handleMessaging(spotifyCurrentlyPlayingData, { retries: COUNT_RETRIES })
}
