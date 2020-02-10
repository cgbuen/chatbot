const MSGS = {
  BROKEN_SHOUT: 'chatbot shoutouts are broken lol',
  INVALID_USER: 'bro i don\'t think this guy is real'
}

module.exports = function so({ message }) {
  const userInput = message.match(/^\!(so|shoutout)\s@?([\w]+)(\s|$)/)[2]
  try {
    const userObj = await api.get('users', { search: { login: userInput } })
    if (userObj.total === 1) {
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
