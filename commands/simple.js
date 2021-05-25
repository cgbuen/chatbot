const fs = require('fs')

module.exports = function simple(command) {
  let msg
  try {
    return JSON.parse(fs.readFileSync('./command-content.json', 'utf8').trim())[command]
  } catch (e) {
    console.log('==> Could not parse command-content', e)
    return 'n/a'
  }
}
