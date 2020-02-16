const fs = require('fs')
const moment = require('moment')
const express = require('express')
const open = require('open')
const { COUNTER } = require('./vars')

const app = express()
const port = 3000

// create log directory (if DNE), today's log, and stats file (if DNE)
const logDir = './twitch-logs'
const startTime = moment()
const dateString = startTime.format('YYYY-MM-DD_HH-mm-ss')
const dateFilename = `${logDir}/${dateString}.txt`
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}
fs.writeFileSync(dateFilename, `${dateString}\n\n`)
if (!fs.existsSync(`./${COUNTER}.json`)) {
  fs.writeFileSync(`./${COUNTER}.json`, '{}')
}

const initSpotify = require('./endpoints/init-spotify')
const initTwitch = require('./endpoints/init-twitch')
app.get('/inittoken-spotify', initSpotify.init)
app.get('/inittoken-twitch', initTwitch.init)
app.get('/callback-spotify', initSpotify.callback)
app.get('/callback-twitch', initTwitch.callback)
app.get('/spotify.json', require('./endpoints/json-spotify'))
app.get('/twitch.json', require('./endpoints/json-twitch'))
app.get('/internal-stats.json', require('./endpoints/json-internal-stats'))
app.get('/nintendo.json', require('./endpoints/json-nintendo'))
app.get('/chat', require('./endpoints/chat')({ dateFilename, startTime }))

app.listen(port, () => console.log(`Spotify callback API endpoint app listening on port ${port}.`))
open('http://localhost:3000/chat')
