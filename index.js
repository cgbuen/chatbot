const express = require('express')
const csrf = require('csrf')
const twitch = require('twitch-js')
const qs = require('qs')
const open = require('open')
const requestSpotify = require('./request-spotify')
const { BOT_USER, CHANNEL, GAME_ID, TWITCH_TOKEN, SPOTIFY_CLIENT_ID } = require('./vars')

const csrfGenerator = csrf()
const CSRF_TOKEN = csrfGenerator.secretSync()

console.log(CSRF_TOKEN)

const app = express()
const port = 3000

app.get('/callback', async (req, res) => {
  if (req.query.state !== CSRF_TOKEN) {
    return res.send('Authentication failed')
  }

  res.send('Authentication successful')

  const spotifyTokenData = await requestSpotify.auth(req.query.code)
  let accessToken = spotifyTokenData.access_token
  let refreshToken = spotifyTokenData.refresh_token

  const twitchOptions = {
    options: {
      debug: true
    },
    connection: {
      cluster: 'aws',
      reconnect: true
    },
    identity: {
      username: BOT_USER,
      password: TWITCH_TOKEN
    },
    channels: [
      CHANNEL
    ]
  }
  const client = new twitch.client(twitchOptions)
  client.connect()

  const handleMessaging = async (currentlyPlayingData, options) => {
    // handle messaging based off of the currentlyPlayingData provided by
    // spotify. could potentially call self recursively if access token expires.

    if (!options.retries) {
      // gone through too many refresh attempts, just tell the user it's broken
      console.log('==> too many refresh attempts')
      const msg = 'chatbot/spotify integration is broken lmao'
      return client.action(CHANNEL, msg)

    } else if (currentlyPlayingData && currentlyPlayingData.error && currentlyPlayingData.error.message && currentlyPlayingData.error.message.includes('xpire')) {
      // if expired error, retry
      console.log('==> expiration error:', currentlyPlayingData.error.message, '- retrying')
      const spotifyTokenDataUpdated = await requestSpotify.refresh(refreshToken)
      accessToken = spotifyTokenDataUpdated.access_token // update access token
      refreshToken = spotifyTokenDataUpdated.refresh_token || refreshToken // update refresh token *if available*
      const spotifyCurrentlyPlayingData = await requestSpotify.currentlyPlaying(accessToken) // try again now that tokens are updated
      return handleMessaging(spotifyCurrentlyPlayingData, { retries: options.retries - 1 }) // recursively call

    } else if (currentlyPlayingData && currentlyPlayingData.error) {
      // if other error, just tell the user it's broken
      console.log('==> miscellaneous error:', currentlyPlayingData.error)
      const msg = 'chatbot/spotify integration is broken lmao'
      return client.action(CHANNEL, msg)

    } else if (currentlyPlayingData && currentlyPlayingData.is_playing && currentlyPlayingData.item) {
      // if you are playing something, display
      console.log('==> playing something')
      const artists = (currentlyPlayingData.item.artists && currentlyPlayingData.item.artists.map(item => item.name).join(', ')) || 'n/a'
      const title = currentlyPlayingData.item.name || 'n/a'
      const album = (currentlyPlayingData.item.album && currentlyPlayingData.item.album.name) || 'n/a'
      const msg = `${artists} - ${title} [${album}]`
      return client.action(CHANNEL, msg)

    } else if (currentlyPlayingData) {
      // if not playing anything, tell user you're not
      console.log('==> spotify not playing anything')
      const msg = 'i\'m not playing anything on spotify rn'
      return client.action(CHANNEL, msg)

    } else {
      // if data wasn't ever even put into function, tell user it's broken
      console.log('==> there is no currentlyPlayingData')
      const msg = 'chatbot/spotify integration is broken lmao'
      return client.action(CHANNEL, msg)
    }
  }

  client.on('chat', async (channel, user, message, self) => {
    if (message === '!fc') {
      return client.action(CHANNEL, GAME_ID)
    }
    if (message === '!song') {
      const spotifyCurrentlyPlayingData = await requestSpotify.currentlyPlaying(accessToken)
      return handleMessaging(spotifyCurrentlyPlayingData, { retries: 3 })
    }
  })
})

app.listen(port, () => console.log(`Spotify callback app listening on port ${port}`))

const query = {
  client_id: SPOTIFY_CLIENT_ID,
  response_type: 'code',
  redirect_uri: 'http://localhost:3000/callback',
  state: CSRF_TOKEN,
  scope: 'user-read-currently-playing',
}
const url = `https://accounts.spotify.com/authorize?${qs.stringify(query)}`
console.log('==> url', url)
open(url)
