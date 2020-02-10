const fs = require('fs')
const moment = require('moment')
const express = require('express')
const Csrf = require('csrf')
const TwitchJs = require('twitch-js').default
const qs = require('qs')
const open = require('open')
const bitRegExp = require('./helpers/bitRegExp')
const requestSpotify = require('./request-spotify')
const requestNintendo = require('./request-nintendo')
const { BOT_USER, CHANNEL, TWITCH_TOKEN, SPOTIFY_CLIENT_ID, COUNTER } = require('./vars')

const csrfGenerator = new Csrf()
const CSRF_SECRET = csrfGenerator.secretSync()
const CSRF_TOKEN = csrfGenerator.create(CSRF_SECRET)
const TWITCH_OPTIONS = {
  token: TWITCH_TOKEN,
  username: BOT_USER
}

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
  const { chat, api } = new TwitchJs(TWITCH_OPTIONS)
  await chat.connect() // only connect to twitch if spotify auth was successful
  await chat.join(CHANNEL)

  chat.on('*', async (msg) => {
    const { command, message, username, channel } = msg
    if (channel === `#${CHANNEL}`) {
      if (command === 'PRIVMSG') {
        fs.appendFileSync(dateFilename, `<${username}> ${message}\n`)
        let msg
        if (/^\!(chri(s|d)?_?s?u(c|k|x)|rekt)/.test(message)) {
          msg = require('./commands/chrissucks')({ chat, username })
        }
        if (message === '!rank') {
          msg = require('./commands/rank')({ chat, username })
        }
        if (message === '!fc') {
          msg = require('./commands/fc')({ chat })
        }
        if (message === '!discord') {
          msg = require('./commands/discord')({ chat })
        }
        if (['!controls', '!sensitivity', '!sens', '!motion'].includes(message)) {
          msg = require('./commands/controls')({ chat })
        }
        if (message === '!song') {
          msg = await require('./commands/spotify-song')({ chat, spotifyTokenData })
        }
        if (message === '!devices') {
          msg = await require('./commands/spotify-devices')({ chat, spotifyTokenData })
        }
        if (/^\!(so|shoutout)\s@?[\w]+(\s|$)/.test(message)) {
          msg = require('./commands/so')({ chat, message })
        }
        if (['!charity', '!support', '!donate', '!bits', '!sub', '!subs', '!subscribe'].includes(message)) {
          msg = require('./commands/charity')({ chat })
        }
        if (message === '!hype') {
          msg = require('./commands/hype')({ chat })
        }
        if (message === '!lurk') {
          msg = require('./commands/lurk')({ chat })
        }
        if (message.startsWith('!up')) {
          msg = require('./commands/uptime')({ chat, startTime })
        }
        if (message === '!commands') {
          msg = require('./commands/commands')({ chat })
        }
        if (bitRegExp.test(message)) {
          msg = require('./commands/bits')({ chat, username, message })
        }
        fs.appendFileSync(dateFilename, `<BOT_${BOT_USER}> ${msg}\n`)
        return chat.say(CHANNEL, msg)
      } else if (!['PONG', 'USERSTATE', 'GLOBALUSERSTATE'].includes(command)) {
        // logs for joins, parts, etc.
        fs.appendFileSync(dateFilename, `==> ${command} ${username} ${message || ''}\n`)
      }
    }
  })
})

app.get('/stats.json', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  return res.send(fs.readFileSync(`${counterDir}/${COUNTER}.json`))
})

app.get('/player.json', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  return res.send(await requestNintendo.requestPlayer())
})

app.listen(port, () => console.log(`Spotify callback API endpoint app listening on port ${port}.`))

const query = {
  client_id: SPOTIFY_CLIENT_ID,
  response_type: 'code',
  redirect_uri: 'http://localhost:3000/callback',
  state: CSRF_TOKEN,
  scope: 'user-read-playback-state',
}
const url = `https://accounts.spotify.com/authorize?${qs.stringify(query)}`
console.log(`==> Opening url: ${url}.`)
open(url)
