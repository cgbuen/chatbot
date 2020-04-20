const fs = require('fs')
const moment = require('moment')
const TwitchJs = require('twitch-js').default
const requestTwitch = require('../helpers/request-twitch')
const { BOT_USER, CHANNEL, TOKEN_STORE } = require('../vars')

module.exports = ({ startTime }) => {
  return async (req, res) => {
    const connectToChat = async (accessToken, { retries = 3 } = {}) => {
      const LOG_DIR = './twitch-logs'
      const dateString = startTime.format('YYYY-MM-DD_HH-mm-ss')
      const dateFilename = `${LOG_DIR}/${dateString}.txt`
      if (!retries) {
        const msg = 'Too many twitch stats refresh attempts'
        console.log(`** ${msg}`)
        data = { error: msg }
        return data
      }

      try {
        const { chat } = new TwitchJs({
          token: accessToken,
          username: BOT_USER
        })

        await chat.connect()
        if (fs.existsSync(dateFilename)) {
          // after initializing TwitchJS and connecting _properly_ (i.e. getting
          // past the above line without hitting the catch block due to auth
          // errors) ensure that you can only hit /chat once when running this
          // server, so that you don't have more than one chatbot. this is the
          // error case.
          const msg = 'Twitch chat connection already exists, so this new instance will disconnect. Restart the server if there are any issues.'
          console.log(`** ${msg}`)
          await chat.disconnect()
          return res.send(msg)
        } else {
          // create the log directory if it doesn't exist
          !fs.existsSync(LOG_DIR) && fs.mkdirSync(LOG_DIR)
          // create the log file if it is in fact the first time /chat was hit,
          // then proceed as normal.
          fs.writeFileSync(dateFilename, `${dateString}\n\n`)
        }
        await chat.join(CHANNEL)

        const chatCallback = async (msg) => {
          const { command, message, username, channel } = msg
          if (channel === `#${CHANNEL}`) {
            if (command === 'PRIVMSG') {
              fs.appendFileSync(dateFilename, `[${moment().format()}] <${username}> ${message}\n`)
              let msg
              if (/^\!(chri(s|d)?_?s?u(c|k|x)|rekt)/.test(message)) {
                msg = require('../commands/chrissucks')({ username })
              }
              if (message === '!rank') {
                msg = require('../commands/rank')({ username })
              }
              if (message === '!fc') {
                msg = require('../commands/fc')()
              }
              if (message === '!discord') {
                msg = require('../commands/discord')()
              }
              if (['!controls', '!sensitivity', '!sens', '!motion'].includes(message)) {
                msg = require('../commands/controls')()
              }
              if (message === '!song') {
                msg = await require('../commands/spotify-song')()
              }
              if (message === '!devices') {
                msg = await require('../commands/spotify-devices')()
              }
              if (/^\!(so|shoutout)\s@?[\w]+(\s|$)/.test(message)) {
                msg = await require('../commands/so')({ message })
              }
              if (['!charity', '!support', '!donate', '!bits', '!sub', '!subs', '!subscribe'].includes(message)) {
                msg = require('../commands/charity')()
              }
              if (message === '!hype') {
                msg = require('../commands/hype')()
              }
              if (message === '!lurk') {
                msg = require('../commands/lurk')()
              }
              if (message.startsWith('!up')) {
                msg = await require('../commands/uptime')()
              }
              if (message === '!commands') {
                msg = require('../commands/commands')()
              }
              if (msg) {
                // new moment used here, in case wait time for msg construction
                // takes long (e.g. due to await)
                fs.appendFileSync(dateFilename, `[${moment().format()}] <BOT_${BOT_USER}> ${msg}\n`)
                return chat.say(CHANNEL, msg)
              }
            } else if (!['PONG', 'USERSTATE', 'GLOBALUSERSTATE'].includes(command)) {
              // logs for joins, parts, etc.
              fs.appendFileSync(dateFilename, `[${moment().format()}] ${command} ${username} ${message || ''}\n`)
            }
          }
        }
        chat.on('*', chatCallback)
        res.redirect('https://dashboard.twitch.tv/u/cgbuen/stream-manager')
      } catch(e) {
        console.log('==> Request twitch api chat error', e)
        if (e.event === 'AUTHENTICATION_FAILED') {
          console.log('** Unauthorized chat response data')
          const twitchTokenDataUpdated = await requestTwitch.refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
          return connectToChat(twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
        } else {
          const msg = 'Error unrelated to authentication failure. Try re-initializing tokens by hitting /inittoken-twitch.'
          const htmlMsg = `Error unrelated to authentication failure. Try re-initializing tokens by hitting the <a href="/inittoken-twitch">Twitch token initialization endpoint</a>.`
          console.log(`** ${msg}`, e)
          return res.send(`
            <html>
              <body>${htmlMsg}</body>
            </html>
          `)
        }
      }
    }
    return await connectToChat(fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
  }
}
