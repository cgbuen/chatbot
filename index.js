const fs = require('fs')
const moment = require('moment')
const express = require('express')
const open = require('open')
const { COUNTER, TOKEN_STORE } = require('./vars')
const LIVE = true
const DEBUG_SPOTIFY = false
const DEBUG_TWITCH = false
const DEBUG_INTERNAL = false
const DEBUG_SPLATOON = false
const DEBUG_ACNH = false

const app = express()
const port = 3000

// create stats file & token store directory (if they don't exist)
!fs.existsSync(`./${COUNTER}.json`) && fs.writeFileSync(`./${COUNTER}.json`, '{}')
!fs.existsSync(`./${TOKEN_STORE}`) && fs.mkdirSync(`./${TOKEN_STORE}`)

const startTime = moment()

const initSpotify = require('./endpoints/init-spotify')
const initTwitch = require('./endpoints/init-twitch')
const initNintendo = require('./endpoints/init-nintendo')
app.get('/init-spotify', initSpotify.init)
app.get('/init-twitch', initTwitch.init)
app.get('/init-nintendo', initNintendo)
app.get('/callback-spotify', initSpotify.callback)
app.get('/callback-twitch', initTwitch.callback)
app.get('/spotify.json', require('./endpoints/json-spotify'))
app.get('/twitch.json', require('./endpoints/json-twitch'))
app.get('/internal-stats.json', require('./endpoints/json-internal-stats'))
app.get('/splatoon.json', require('./endpoints/json-splatoon'))
app.get('/acnh.json', require('./endpoints/json-acnh'))
app.get('/chat', require('./endpoints/chat')({ startTime }))
app.get('/pubsub', require('./endpoints/pubsub'))

app.listen(port, () => console.log(`Spotify callback API endpoint app listening on port ${port}.`))
if (LIVE) {
  open(`${'http://localhost:3000'}${fs.existsSync(`./${TOKEN_STORE}/twitch-access`) ? '/chat' : '/init-twitch'}`)
  setTimeout(function() {
    open(`${'http://localhost:3000'}/pubsub`)
  }, 8000)
} else if (DEBUG_SPOTIFY) {
  open(`${'http://localhost:3000'}/spotify.json`)
} else if (DEBUG_TWITCH) {
  open(`${'http://localhost:3000'}/twitch.json`)
} else if (DEBUG_INTERNAL) {
  open(`${'http://localhost:3000'}/internal.json`)
} else if (DEBUG_SPLATOON) {
  open(`${'http://localhost:3000'}/splatoon.json`)
} else if (DEBUG_ACNH) {
  open(`${'http://localhost:3000'}/acnh.json`)
}
