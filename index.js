const express = require('express')
const csrf = require('csrf')
const twitch = require('twitch-js')
const qs = require('qs')
const open = require('open')
const requestSpotify = require('./request-spotify')
const { BOT_USER, CHANNEL, GAME_ID, TWITCH_TOKEN, SPOTIFY_CLIENT_ID } = require('./vars')

const csrfGenerator = new csrf()
const CSRF_SECRET = csrfGenerator.secretSync()
const CSRF_TOKEN = csrfGenerator.create(CSRF_SECRET)
const MSG_BROKEN = 'chatbot/spotify integration is broken lmao'
const MSG_NOT_PLAYING = 'i\'m not playing anything on spotify rn'
const COUNT_RETRIES = 3
const TWITCH_OPTIONS = {
  options: { debug: true },
  connection: { cluster: 'aws', reconnect: true },
  identity: { username: BOT_USER, password: TWITCH_TOKEN },
  channels: [ CHANNEL ]
}

const app = express()
const port = 3000

app.get('/callback', async (req, res) => {
  if (!csrfGenerator.verify(CSRF_SECRET, req.query.state)) {
    // spotify recommends the use of the state parameter for CSRF protection.
    // as a separate note, spotify additionally has extra redirection
    // protection through the use of a configurable whitelist from your app's
    // dashboard.
    return res.send('Authentication failed.')
  }

  res.send('Authentication successful. You can now close this page.')

  const spotifyTokenData = await requestSpotify.auth(req.query.code)
  let accessToken = spotifyTokenData.access_token
  let refreshToken = spotifyTokenData.refresh_token

  const client = new twitch.client(TWITCH_OPTIONS)
  client.connect() // only connect to twitch if spotify auth was successful

  const handleMessaging = async (currentlyPlayingData, options) => {
    // handle messaging based off of the currentlyPlayingData provided by
    // spotify. calls self in the case that access token expires.

    if (!options.retries) {
      // if too many refresh attempts or attempts not specified, just tell the
      // user it's broken
      console.log('==> Too many refresh attempts.')
      return client.action(CHANNEL, MSG_BROKEN)

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
      return client.action(CHANNEL, MSG_BROKEN)

    } else if (currentlyPlayingData && currentlyPlayingData.is_playing && currentlyPlayingData.item) {
      // if you are playing something, display
      console.log('==> Song currently playing.')
      const artists = (currentlyPlayingData.item.artists && currentlyPlayingData.item.artists.map(item => item.name).join(', ')) || 'n/a'
      const title = currentlyPlayingData.item.name || 'n/a'
      const album = (currentlyPlayingData.item.album && currentlyPlayingData.item.album.name) || 'n/a'
      const msg = `${artists} - ${title} [${album}]`
      return client.action(CHANNEL, msg)

    } else if (currentlyPlayingData) {
      // if not playing anything, tell user you're not playing anything
      console.log('==> No song currently playing.')
      return client.action(CHANNEL, MSG_NOT_PLAYING)

    } else {
      // if data wasn't ever even put into function, tell user it's broken
      console.log('==> currentlyPlayingData not provided.')
      return client.action(CHANNEL, MSG_BROKEN)
    }
  }

  client.on('chat', async (channel, user, message, self) => {
    if (message === '!fc') {
      return client.action(CHANNEL, GAME_ID)
    }
    if (message === '!song') {
      const spotifyCurrentlyPlayingData = await requestSpotify.currentlyPlaying(accessToken)
      return handleMessaging(spotifyCurrentlyPlayingData, { retries: COUNT_RETRIES })
    }
  })
})

app.listen(port, () => console.log(`Spotify callback API endpoint app listening on port ${port}.`))

const query = {
  client_id: SPOTIFY_CLIENT_ID,
  response_type: 'code',
  redirect_uri: 'http://localhost:3000/callback',
  state: CSRF_TOKEN,
  scope: 'user-read-currently-playing',
}
const url = `https://accounts.spotify.com/authorize?${qs.stringify(query)}`
console.log(`==> Opening url: ${url}.`)
open(url)
