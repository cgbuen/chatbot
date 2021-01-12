const fs = require('fs')

module.exports = function charity() {
  let msg
  try {
    const { CHARITY } = JSON.parse(fs.readFileSync('./command-content.json', 'utf8').trim())
    msg = CHARITY
  } catch (e) {
    console.log('==> Could not parse command-content', e)
    msg = 'n/a'
  }
  return msg
}
