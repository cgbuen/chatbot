const fs = require('fs')

module.exports = function pc() {
  let msg
  try {
    const { PC } = JSON.parse(fs.readFileSync('./command-content.json', 'utf8').trim())
    msg = PC
  } catch (e) {
    console.log('==> Could not parse command-content', e)
    msg = 'n/a'
  }
  return msg
}
