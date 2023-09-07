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
              if (/^\!(game|category|title)\s+(.*?)\s*$/.test(message)) {
                msg = await require('../commands/stream-status')(username, message)
              }
              if (/^\!((c|k)h?ri(s|d|z)?_?s?u(c|k|x)|rekt)/.test(message)) {
                msg = require('../commands/chrissucks')({ username })
              }
              if (message === '!rank') {
                msg = require('../commands/rank')({ username })
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
              if (message.startsWith('!up')) {
                msg = await require('../commands/uptime')()
              }
              if (['!acmessage', '!acnhmessage'].includes(message)) {
                msg = require('../commands/simple')('AC_MESSAGE')
              }
              if (['!build', '!specs'].includes(message)) {
                msg = require('../commands/simple')('BUILD')
              }
              if (['!cassette', '!cassettes', '!tape', '!tapedeck', '!nakamichi'].includes(message)) {
                msg = require('../commands/simple')('CASSETTES')
              }
              if (['!charity', '!support', '!donate'].includes(message)) {
                msg = require('../commands/simple')('CHARITY')
              }
              if (['!collection', '!keyboards', '!boards'].includes(message)) {
                msg = require('../commands/simple')('COLLECTION')
              }
              if (['!controls', '!sensitivity', '!sens', '!motion'].includes(message)) {
                msg = require('../commands/simple')('CONTROLS')
              }
              if (message === '!discord') {
                msg = require('../commands/simple')('DISCORD')
              }
              if (['!dk', '!dk750ti', '!donkeykong'].includes(message)) {
                msg = require('../commands/simple')('DK')
              }
              if (message === '!film') {
                msg = require('../commands/simple')('FILM')
              }
              if (message === '!fc') {
                msg = require('../commands/simple')('GAME_ID')
              }
              if (['!gear', '!camera', '!cameras', '!cam', '!cams', '!facecam', '!microphone', '!mic', '!lavmic', '!microphones', '!mics', '!lighting', '!audio', '!soldering', '!desoldering', '!joycon', '!scanning'].includes(message)) {
                msg = require('../commands/simple')('GEAR')
              }
              if (['!giveaway', '!giveaways'].includes(message)) {
                msg = require('../commands/simple')('GIVEAWAY')
              }
              if (message === '!hype') {
                msg = require('../commands/simple')('HYPE_GAME')
              }
              if (message === '!raid1') {
                msg = require('../commands/simple')('RAID1')
              }
              if (message === '!raid2') {
                msg = require('../commands/simple')('RAID2')
              }
              if (message === '!subhype') {
                msg = require('../commands/simple')('HYPE_SUB')
              }
              if (['!keyboard', '!board'].includes(message)) {
                msg = require('../commands/simple')('KEYBOARD')
              }
              if (message.startsWith('!lurk')) {
                msg = require('../commands/simple')('LURK')
              }
              if (message === '!pc') {
                msg = require('../commands/simple')('PC')
              }
              if (message === '!streampc') {
                msg = require('../commands/simple')('PC_STREAM')
              }
              if (['!plate', '!plates'].includes(message)) {
                msg = require('../commands/simple')('PLATES')
              }
              if (message === '!socials') {
                msg = require('../commands/simple')('SOCIALS_ALL')
              }
              if (message === '!instagram') {
                msg = require('../commands/simple')('SOCIALS_IG')
              }
              if (message === '!twitter') {
                msg = require('../commands/simple')('SOCIALS_TWITTER')
              }
              if (['!git', '!github'].includes(message)) {
                msg = require('../commands/simple')('SOCIALS_GITHUB')
              }
              if (['!youtube', '!yt'].includes(message)) {
                msg = require('../commands/simple')('SOCIALS_YOUTUBE')
              }
              if (['!vods', '!vod'].includes(message)) {
                msg = require('../commands/simple')('SOCIALS_YOUTUBE_VODS')
              }
              if (['!vinyl', '!records', '!discogs'].includes(message)) {
                msg = require('../commands/simple')('VINYL')
              }
              if (['!website', '!site'].includes(message)) {
                msg = require('../commands/simple')('WEBSITE')
              }
              if (['!keeb'].includes(message)) {
                msg = require('../commands/simple')('DISAPPROVAL')
              }
              if (['!commands', '!help'].includes(message)) {
                msg = require('../commands/simple')('COMMANDS')
              }
              if (['!waru', '!warugaki', '!deez'].includes(message)) {
                msg = require('../commands/simple')('WARUGAKI')
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
          const msg = 'Error unrelated to authentication failure. Try re-initializing tokens by hitting /init-twitch.'
          const htmlMsg = `Error unrelated to authentication failure. Try re-initializing tokens by hitting the <a href="/init-twitch">Twitch token initialization endpoint</a>.`
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
