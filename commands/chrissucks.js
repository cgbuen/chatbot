const fs = require('fs')
const { COUNTER } = require('../vars')

module.exports = function chrissucks({ chat, username }) {
  // !chrissucks: send simple message while recording a score to a file
  const dict = JSON.parse(fs.readFileSync(`./${COUNTER}.json`))
  if (dict[username] && dict[username].chrissucks) {
    dict[username].chrissucks++
  } else if (dict[username]) {
    dict[username].chrissucks = 1
  } else {
    dict[username] = {
      name: username,
      chrissucks: 1
    }
  }
  const msg = 'ya'
  fs.writeFileSync(`./${COUNTER}.json`, JSON.stringify(dict))
  return msg
}
