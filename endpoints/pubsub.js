const WebSocket = require('ws')
const fs = require('fs')
const requestTwitch = require('../helpers/request-twitch')
const requestAcnh = require('../helpers/request-acnh')
const { BOT_USER, CHANNEL, TOKEN_STORE } = require('../vars')

module.exports = async (req, res) => {
  const connectToPubSub = async (accessToken, { retries = 3 } = {}) => {
    if (!retries) {
      const msg = 'Too many twitch stats refresh attempts'
      console.log(`** ${msg}`)
      data = { error: msg }
      return data
    }

    try {
      const ws = new WebSocket('wss://pubsub-edge.twitch.tv')
      const user = (fs.readFileSync(`./${TOKEN_STORE}/twitch-data-user`, 'utf8') || '').trim()
      const objPing = JSON.stringify({ type: 'PING' })
      const objListen = JSON.stringify({
        type: 'LISTEN',
        data: {
          topics: [`channel-points-channel-v1.${user}`],
          auth_token: accessToken
        }
      })

      ws.on('open', function() {
        console.log('--> Open cgb sockets connection')
        ws.send(objListen)
        console.log('PING::cgb pubsub-edge.twitch.tv')
        ws.send(objPing)
        setInterval(function() {
          console.log('PING::cgb pubsub-edge.twitch.tv')
          ws.send(objPing)
        }, 60*1000)
      })

      ws.on('message', async function(data) {
        try {
          const parsedData = JSON.parse(data)
          if (parsedData.error === "ERR_BADAUTH") {
            console.log('==> Request twitch pubsub error')
            if (retries) {
              console.log('** Unauthorized pubsub response data')
              const twitchTokenDataUpdated = await requestTwitch.refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
              ws.close()
              return connectToPubSub(twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
            } else {
              const msg = 'Error unrelated to authentication failure. Try re-initializing tokens by hitting /init-twitch.'
              const htmlMsg = `Error unrelated to authentication failure. Try re-initializing tokens by hitting the <a href="/init-twitch">Twitch token initialization endpoint</a>.`
              console.log(`** ${msg}`)
              ws.close()
              return res.send(`
                <html>
                  <body>${htmlMsg}</body>
                </html>
              `)
            }
          } else if (parsedData.type === 'MESSAGE') {
            const message = JSON.parse(parsedData.data.message)
            if (message.type === 'reward-redeemed' && message.data.redemption.reward.title.includes('ACNH')) {
              const acnhAccessToken = (fs.readFileSync(`./${TOKEN_STORE}/acnh-access`, 'utf8') || '').trim()
              const userInput = message.data.redemption.user_input
              requestAcnh.postKeyboard(acnhAccessToken, userInput)
            }
          } else if (parsedData.type === 'RECONNECT') {
            ws.close()
            return connectToPubSub(twitchTokenDataUpdated.access_token) // try again after tokens updated
          } else if (parsedData.type === 'PONG') {
            console.log('PONG::cgb pubsub-edge.twitch.tv')
          }
        } catch (e) {
          console.log('error ws onmessage', e)
        }
      })

      res.redirect('https://dashboard.twitch.tv/u/cgbuen/community/channel-points/rewards')
    } catch(e) {
    }
  }
  return await connectToPubSub(fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
}
