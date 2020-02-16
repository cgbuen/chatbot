const fs = require('fs')
const TwitchJs = require('twitch-js').default
const requestTwitch = require('../helpers/request-twitch')
const bitRegExp = require('../helpers/bitRegExp')
const { BOT_USER, CHANNEL } = require('../vars')

module.exports = ({ dateFilename, startTime }) => {
  return async (req, res) => {
    const connectToChat = async (accessToken, { retries = 3 } = {}) => {
      if (!retries) {
        console.log('** too many twitch stats refresh attempts')
        data = { error: 'Too many Stats refresh attempts.', }
        return data
      }

      try {
        const { chat } = new TwitchJs({
          token: accessToken,
          username: BOT_USER
        })
        await chat.connect()
        await chat.join(CHANNEL)

        const chatCallback = async (msg) => {
          const { command, message, username, channel } = msg
          if (channel === `#${CHANNEL}`) {
            if (command === 'PRIVMSG') {
              fs.appendFileSync(dateFilename, `<${username}> ${message}\n`)
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
                msg = require('../commands/uptime')({ startTime })
              }
              if (message === '!commands') {
                msg = require('../commands/commands')()
              }
              if (bitRegExp.test(message)) {
                msg = require('../commands/bits')({ username, message })
              }
              fs.appendFileSync(dateFilename, `<BOT_${BOT_USER}> ${msg}\n`)
              return chat.say(CHANNEL, msg)
            } else if (!['PONG', 'USERSTATE', 'GLOBALUSERSTATE'].includes(command)) {
              // logs for joins, parts, etc.
              fs.appendFileSync(dateFilename, `==> ${command} ${username} ${message || ''}\n`)
            }
          }
        }
        chat.on('*', chatCallback)
        res.redirect('https://dashboard.twitch.tv/u/cgbuen/stream-manager')
      } catch(e) {
        console.log('==> Request twitch api chat error', e)
        if (e.event === 'AUTHENTICATION_FAILED') {
          console.log('** Unauthorized chat response data')
          const twitchTokenDataUpdated = await requestTwitch.refresh(fs.readFileSync('./token-store/twitch-refresh', 'utf8'))
          return connectToChat(twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
        } else {
          console.log('** Error unrelated to authentication failure')
        }
      }
    }
    return await connectToChat(fs.readFileSync('./token-store/twitch-access', 'utf8').trim())
  }
}
