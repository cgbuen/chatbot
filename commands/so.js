const fs = require('fs')
const requestTwitch = require('../helpers/request-twitch')
const { TOKEN_STORE } = require('../vars')

const MSGS = {
  BROKEN_SHOUT: 'chatbot shoutouts are broken lol',
  INVALID_USER: 'bro i don\'t think this guy is real'
}

module.exports = async function so({ message }) {
  const accessToken = fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8')
  const userInput = message.match(/^\!(so|shoutout)\s@?([\w]+)(\s|$)/)[2]
  try {
    const userArray = await requestTwitch.lookupUser(accessToken, userInput)
    if (userArray.length === 1) {
      const msg = `shouts out ${userInput} https://twitch.tv/${userInput} ayyyy`
      return msg
    } else {
      const msg = MSGS.INVALID_USER
      return msg
    }
  } catch (e) {
    console.log('==> Request fetch error api user', e)
    const msg = MSGS.BROKEN_SHOUT
    return msg
  }
}
