const twitch = require('twitch-js')
const fetch = require('node-fetch')
const { BOT_USER, CHANNEL, TWITCH_TOKEN, SPOTIFY_TOKEN, GAME_ID } = require('./vars')

const options = {
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

const client = new twitch.client(options)

client.connect()

// open browser with spotify auth thing
// https://accounts.spotify.com/authorize?client_id=5cdf82fa6fef411e9b2a71d95c08ec2d&response_type=code&redirect_uri=https%3A%2F%2Fcgbuen.io%2Fcallback&scope=user-read-currently-playing

client.on('chat', (channel, user, message, self) => {
  if (message === '!fc') {
    client.action(CHANNEL, GAME_ID)
  }
  if (message === '!song') {
    fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${SPOTIFY_TOKEN}`
      }
    })
      .then(res => res.json())
      .then(cp => {
        if (cp.error) {
          throw new Error(cp.error)
        }
        if (cp.is_playing && cp.item) {
          const artists = (cp.item.artists && cp.item.artists.map(item => item.name).join(', ')) || 'n/a'
          const title = cp.item.name || 'n/a'
          const album = (cp.item.album && cp.item.album.name) || 'n/a'
          const msg = `${artists} - ${title} [${album}]`
          console.log(`==> response to ${user}: ${msg}`)
          client.action(CHANNEL, msg)
        } else {
          const msg = 'spotify\'s not playing anything rn'
          console.log('cp', cp)
          console.log(`==> response to ${user}: ${msg}`)
          client.action(CHANNEL, msg)
        }
      })
      .catch(err => {
        const msg = 'chatbot/spotify integration is broken lmao'
        console.log(`==> response to ${user}: ${msg}`)
        client.action(CHANNEL, msg)
      })
    
  }
})
