const fs = require('fs')
const fetch = require('node-fetch')
const moment = require('moment')
const express = require('express')
const Csrf = require('csrf')
const TwitchJs = require('twitch-js').default
const qs = require('qs')
const open = require('open')
const bitRegExp = require('./helpers/bitRegExp')
const requestSpotify = require('./helpers/request-spotify')
const requestTwitch = require('./helpers/request-twitch')
const { BOT_USER, CHANNEL, SPOTIFY_CLIENT_ID, TWITCH_CLIENT_ID, COUNTER } = require('./vars')

const csrfGenerator = new Csrf()
const CSRF_SECRET = csrfGenerator.secretSync()
const CSRF_TOKEN = csrfGenerator.create(CSRF_SECRET)
const TWITCH_OPTIONS = {
  token: fs.readFileSync('./token-store/twitch-access', 'utf8').trim(),
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

app.get('/initialize-spotify-token', async (req, res) => {
  const query = {
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: 'http://localhost:3000/spotify-callback',
    state: CSRF_TOKEN,
    scope: 'user-read-playback-state',
  }
  const url = `https://accounts.spotify.com/authorize?${qs.stringify(query)}`
  return res.redirect(url)
})

app.get('/spotify-callback', async (req, res) => {
  if (!csrfGenerator.verify(CSRF_SECRET, req.query.state)) {
    return res.send('Authentication failed.')
  }
  const tokenData = await requestSpotify.auth(req.query.code)
  fs.writeFileSync('./token-store/spotify-access', tokenData.access_token)
  fs.writeFileSync('./token-store/spotify-refresh', tokenData.refresh_token)
  return res.send('Stored Spotify tokens.')
})

app.get('/initialize-twitch-token', async (req, res) => {
  const query = {
    client_id: TWITCH_CLIENT_ID,
    response_type: 'code',
    redirect_uri: 'http://localhost:3000/twitch-callback',
    state: CSRF_TOKEN,
    force_verify: true,
    scope: [
      'channel:read:subscriptions',
      'bits:read',
      'chat:read',
      'chat:edit',
      'channel:moderate',
      'whispers:read',
      'whispers:edit',
      'channel_editor',
      'channel_subscriptions',
    ].join('__PLUS__')
  }
  const url = `https://id.twitch.tv/oauth2/authorize?${qs.stringify(query)}`.replace(/__PLUS__/g, '+')
  return res.redirect(url)
})

app.get('/twitch-callback', async (req, res) => {
  if (!csrfGenerator.verify(CSRF_SECRET, req.query.state)) {
    return res.send('Authentication failed.')
  }
  const tokenData = await requestTwitch.auth(req.query.code)
  fs.writeFileSync('./token-store/twitch-access', tokenData.access_token)
  fs.writeFileSync('./token-store/twitch-refresh', tokenData.refresh_token)
  return res.send('Stored Twitch tokens.')
})

app.get('/spotify.json', async (req, res) => {
  const playing = await requestSpotify.currentlyPlaying(fs.readFileSync('./token-store/spotify-access', 'utf8').trim())
  return res.send(playing)
})

app.get('/twitch.json', async (req, res) => {
  const subs = await requestTwitch.getAllStats(fs.readFileSync('./token-store/twitch-access', 'utf8').trim())
  return res.send(subs)
})

app.get('/stats.json', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  return res.send(fs.readFileSync(`${counterDir}/${COUNTER}.json`))
})

app.get('/player.json', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const requestNintendo = require('./request-nintendo')
  return res.send(await requestNintendo.requestPlayer())
})

app.get('/chat', async (req, res) => {
  const { chat, api } = new TwitchJs(TWITCH_OPTIONS)
  await chat.connect()
  await chat.join(CHANNEL)

  chat.on('*', async (msg) => {
    const { command, message, username, channel } = msg
    if (channel === `#${CHANNEL}`) {
      if (command === 'PRIVMSG') {
        fs.appendFileSync(dateFilename, `<${username}> ${message}\n`)
        let msg
        if (/^\!(chri(s|d)?_?s?u(c|k|x)|rekt)/.test(message)) {
          msg = require('./commands/chrissucks')({ username })
        }
        if (message === '!rank') {
          msg = require('./commands/rank')({ username })
        }
        if (message === '!fc') {
          msg = require('./commands/fc')()
        }
        if (message === '!discord') {
          msg = require('./commands/discord')()
        }
        if (['!controls', '!sensitivity', '!sens', '!motion'].includes(message)) {
          msg = require('./commands/controls')()
        }
        if (message === '!song') {
          msg = await require('./commands/spotify-song')()
        }
        if (message === '!devices') {
          msg = await require('./commands/spotify-devices')()
        }
        if (/^\!(so|shoutout)\s@?[\w]+(\s|$)/.test(message)) {
          msg = await require('./commands/so')({ message, api })
        }
        if (['!charity', '!support', '!donate', '!bits', '!sub', '!subs', '!subscribe'].includes(message)) {
          msg = require('./commands/charity')()
        }
        if (message === '!hype') {
          msg = require('./commands/hype')()
        }
        if (message === '!lurk') {
          msg = require('./commands/lurk')()
        }
        if (message.startsWith('!up')) {
          msg = require('./commands/uptime')({ startTime })
        }
        if (message === '!commands') {
          msg = require('./commands/commands')()
        }
        if (bitRegExp.test(message)) {
          msg = require('./commands/bits')({ username, message })
        }
        fs.appendFileSync(dateFilename, `<BOT_${BOT_USER}> ${msg}\n`)
        return chat.say(CHANNEL, msg)
      } else if (!['PONG', 'USERSTATE', 'GLOBALUSERSTATE'].includes(command)) {
        // logs for joins, parts, etc.
        fs.appendFileSync(dateFilename, `==> ${command} ${username} ${message || ''}\n`)
      }
    }
  })
  res.redirect('https://dashboard.twitch.tv/u/cgbuen/stream-manager')
})

app.listen(port, () => console.log(`Spotify callback API endpoint app listening on port ${port}.`))
open('http://localhost:3000/chat')
