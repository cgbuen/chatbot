const fs = require('fs')
const moment = require('moment')
const express = require('express')
const Csrf = require('csrf')
const TwitchJs = require('twitch-js').default
const qs = require('qs')
const open = require('open')
const requestSpotify = require('./request-spotify')
const { BOT_USER, CHANNEL, GAME_ID, TWITCH_TOKEN, SPOTIFY_CLIENT_ID, DISCORD } = require('./vars')

const csrfGenerator = new Csrf()
const CSRF_SECRET = csrfGenerator.secretSync()
const CSRF_TOKEN = csrfGenerator.create(CSRF_SECRET)
const COUNT_RETRIES = 3
const MSGS = {
  BROKEN_SPOTIFY: 'chatbot/spotify integration is broken lmao',
  BROKEN_SHOUT: 'chatbot shoutouts are broken lol',
  NOT_PLAYING: 'i\'m not playing anything on spotify rn',
  INVALID_USER: 'bro i don\'t think this guy is real'
}
const TWITCH_OPTIONS = {
  token: TWITCH_TOKEN,
  username: BOT_USER
}

const app = express()
const port = 3000


const dir = './twitch-logs'
const dateString = moment().format('YYYY-MM-DD_HH-mm-ss')
const dateFilename = `${dir}/${dateString}.txt`
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir)
}
fs.writeFileSync(dateFilename, `${dateString}\n\n`)

const botLog = msg => {
  return fs.appendFileSync(dateFilename, `<BOT_${BOT_USER}> ${msg}\n`)
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
  let accessToken = spotifyTokenData.access_token
  let refreshToken = spotifyTokenData.refresh_token

  const { chat, api } = new TwitchJs(TWITCH_OPTIONS)
  await chat.connect() // only connect to twitch if spotify auth was successful
  await chat.join(CHANNEL)

  const handleMessaging = async (currentlyPlayingData, options) => {
    // handle messaging based off of the currentlyPlayingData provided by
    // spotify. calls self in the case that access token expires.

    if (!options.retries) {
      // if too many refresh attempts or attempts not specified, just tell the
      // user it's broken
      console.log('==> Too many refresh attempts.')
      botLog(MSGS.BROKEN_SPOTIFY)
      return chat.say(CHANNEL, MSGS.BROKEN_SPOTIFY)

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
      botLog(MSGS.BROKEN_SPOTIFY)
      return chat.say(CHANNEL, MSGS.BROKEN_SPOTIFY)

    } else if (currentlyPlayingData && currentlyPlayingData.is_playing && currentlyPlayingData.item && currentlyPlayingData.device) {
      // if you are playing something, display
      console.log('==> Song currently playing.')
      const artists = (currentlyPlayingData.item.artists && currentlyPlayingData.item.artists.map(item => item.name).join(', ')) || 'n/a'
      const title = currentlyPlayingData.item.name || 'n/a'
      const album = (currentlyPlayingData.item.album && currentlyPlayingData.item.album.name) || 'n/a'
      // const device = currentlyPlayingData.device.name
      const msg = `${artists} - ${title} [${album}]`
      botLog(msg)
      return chat.say(CHANNEL, msg)

    } else if (currentlyPlayingData) {
      // if not playing anything, tell user you're not playing anything
      console.log(`==> No song currently playing.${currentlyPlayingData.noSession ? ' (No current session.)' : ''}`)
      botLog(MSGS.NOT_PLAYING)
      return chat.say(CHANNEL, MSGS.NOT_PLAYING)

    } else {
      // fallback, e.g. if data wasn't ever even put into function, tell user
      // it's broken
      console.log('==> currentlyPlayingData not provided.')
      botLog(MSGS.BROKEN_SPOTIFY)
      return chat.say(CHANNEL, MSGS.BROKEN_SPOTIFY)
    }
  }

  chat.on('*', async (msg) => {
    const { command, message, username, channel } = msg
    if (channel === `#${CHANNEL}`) {
      if (command === 'PRIVMSG') {
        fs.appendFileSync(dateFilename, `<${username}> ${message}\n`)
        if (['!chrissucks', '!chrissux', '!chrisucks', '!chrisux', '!chris_sucks', '!chris_sux'].includes(message)) {
          const msg = 'ya'
          botLog(msg)
          return chat.say(CHANNEL, msg)
        }
        if (message === '!fc') {
          botLog(GAME_ID)
          return chat.say(CHANNEL, GAME_ID)
        }
        if (message === '!discord') {
          const msg = `join the discord for clips, vc, etc.: ${DISCORD}`
          botLog(msg)
          return chat.say(CHANNEL, msg)
        }
        if (['!controls', '!sensitivity', '!sens', '!motion'].includes(message)) {
          const msg = 'pro controller, motion 4.0, R stick 0'
          botLog(msg)
          return chat.say(CHANNEL, msg)
        }
        if (message === '!song') {
          const spotifyCurrentlyPlayingData = await requestSpotify.currentlyPlaying(accessToken)
          return handleMessaging(spotifyCurrentlyPlayingData, { retries: COUNT_RETRIES })
        }
        if (/^\!(so|shoutout)\s[\w]+(\s|$)/.test(message)) {
          const userInput = message.match(/^\!(so|shoutout)\s([\w]+)(\s|$)/)[2]
          try {
            const userObj = await api.get('users', { search: { login: userInput } })
            if (userObj.total === 1) {
              const msg = `shouts out ${userInput} https://twitch.tv/${userInput} ayyyy`
              botLog(msg)
              return chat.say(CHANNEL, msg)
            } else {
              botLog(MSGS.INVALID_USER)
              return chat.say(CHANNEL, MSGS.INVALID_USER)
            }
          } catch (e) {
            console.log('==> Request fetch error api user', e)
            botLog(MSGS.BROKEN_SHOUT)
            return chat.say(CHANNEL, MSGS.BROKEN_SHOUT)
          }
        }
        if (message === '!commands') {
          const msg = '!commands / !fc / !discord / !controls / !so [user] / !song / !chrissucks, more info in the channel note panels below'
          botLog(msg)
          return chat.say(CHANNEL, msg)
        }
        if (message === '!devices') {
          const spotifyDeviceData = await requestSpotify.devices(accessToken)
          const msg = spotifyDeviceData.devices.map(device => `${device.name} (${device.type})`).join(', ') || 'no devices'
          botLog(msg)
          return chat.say(CHANNEL, msg)
        }
      } else if (!['PONG', 'USERSTATE', 'GLOBALUSERSTATE'].includes(command)) {
        // joins, parts, etc.
        fs.appendFileSync(dateFilename, `==> ${command} ${username} ${message || ''}\n`)
      }
    }
  })
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
