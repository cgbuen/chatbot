const fs = require('fs')

module.exports = function pcStream() {
  let msg
  try {
    const { PC_STREAM } = JSON.parse(fs.readFileSync('./command-content.json', 'utf8').trim())
    msg = PC_STREAM
  } catch (e) {
    console.log('==> Could not parse command-content', e)
    msg = 'n/a'
  }
  return msg
}
