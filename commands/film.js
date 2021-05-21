const fs = require('fs')

module.exports = function film() {
  let msg
  try {
    const { FILM } = JSON.parse(fs.readFileSync('./command-content.json', 'utf8').trim())
    msg = FILM
  } catch (e) {
    console.log('==> Could not parse command-content', e)
    msg = 'n/a'
  }
  return msg
}
