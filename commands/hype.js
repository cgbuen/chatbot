const fs = require('fs')

module.exports = function hype(message) {
  let msg
  try {
    const { HYPE_GAME, HYPE_SUB } = JSON.parse(fs.readFileSync('./command-content.json', 'utf8').trim())
    if (message === '!subhype') {
      msg = HYPE_SUB
    } else {
      msg = HYPE_GAME
    }
  } catch (e) {
    console.log('==> Could not parse command-content')
    msg = 'n/a'
  }
  return msg
}
