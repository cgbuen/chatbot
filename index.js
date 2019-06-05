const fetch = require('node-fetch')
const express = require('express')
const twitch = require('twitch-js')
const qs = require('qs')
const open = require('open')
const { BOT_USER, CHANNEL, GAME_ID, TWITCH_TOKEN, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = require('./vars');

const app = express()
const port = 3000

app.get('/callback', (req, res) => {
  res.send('Authenticated.')

  const spotifyOptionsAuth = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: qs.stringify({
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: 'http://localhost:3000/callback',
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET
    })
  }

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

  fetch('https://accounts.spotify.com/api/token', spotifyOptionsAuth)
    .then(res => res.json())
    .then(tokens => {
      let accessToken = tokens.access_token
      let refreshToken = tokens.refresh_token

      const client = new twitch.client(twitchOptions)
      client.connect()

      const handleMessaging = cp => {
        if (cp.error && cp.error.includes('xpire')) {
          console.log('==> expiration error:', cp.error)
          fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            body: qs.stringify({
              grant_type: 'refresh_token',
              refresh_token: refreshToken
            })
          })
            .then(res => res.json())
            .then(updatedTokens => {
              accessToken = updatedTokens.access_token
              refreshToken = updatedTokens.refresh_token || refreshToken
              fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                  Authorization: `Bearer ${accessToken}`
                }
              })
                .catch(err => {
                  const msg = 'chatbot/spotify integration is broken lmao'
                  console.log('==> caught error trying to perform refresh request', err)
                  client.action(CHANNEL, msg)
                })
            })
            .then(handleMessaging)
            .catch(err => {
              const msg = 'chatbot/spotify integration is broken lmao'
              console.log('==> caught error in refresh procedure', err)
              client.action(CHANNEL, msg)
            })
        } else if (cp.error) {
          console.log('==> miscellaneous error:', cp.error)
          throw new Error(cp.error)
        }
        if (cp.is_playing && cp.item) {
          const artists = (cp.item.artists && cp.item.artists.map(item => item.name).join(', ')) || 'n/a'
          const title = cp.item.name || 'n/a'
          const album = (cp.item.album && cp.item.album.name) || 'n/a'
          const msg = `${artists} - ${title} [${album}]`
          client.action(CHANNEL, msg)
        } else {
          const msg = 'spotify\'s not playing anything rn'
          console.log('==> spotify not playing anything; cp', cp)
          client.action(CHANNEL, msg)
        }
      }

      client.on('chat', (channel, user, message, self) => {
        if (message === '!fc') {
          client.action(CHANNEL, GAME_ID)
        }
        if (message === '!song') {
          fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          })
            .then(res => res.json())
            .then(handleMessaging)
            .catch(err => {
              const msg = 'chatbot/spotify integration is broken lmao'
              console.log('==> caught error in chat action', err)
              client.action(CHANNEL, msg)
            })
          
        }
      })
    })
    .catch(err => {
      const msg = 'chatbot/spotify integration is broken lmao'
      console.log('==> caught error trying to perform initial auth', err)
      client.action(CHANNEL, msg)
    })

})

app.listen(port, () => console.log(`Spotify callback app listening on port ${port}`))

const query = {
  client_id: SPOTIFY_CLIENT_ID,
  response_type: 'code',
  redirect_uri: 'http://localhost:3000/callback',
  scope: 'user-read-currently-playing'
}
open(`https://accounts.spotify.com/authorize?${qs.stringify(query)}`)
