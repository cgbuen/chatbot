const fs = require('fs')

module.exports = function build(message) {
  let msg
  try {
    const { BUILD, BUILD_IS_KEYBOARD, BUILD_NOT_KEYBOARD_MSG } = JSON.parse(fs.readFileSync('./command-content.json', 'utf8').trim())
    if (BUILD_IS_KEYBOARD) {
      msg = BUILD
    } else {
      msg = BUILD_NOT_KEYBOARD_MSG
    }
  } catch (e) {
    console.log('==> Could not parse command-content', e)
    msg = 'n/a'

  }
  return msg
}
