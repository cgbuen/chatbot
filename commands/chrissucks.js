const fs = require('fs')
const { COUNTER } = require('../vars')

module.exports = function chrissucks({ username }) {
  // !chrissucks: send simple message while recording a score to a file
  const dict = JSON.parse(fs.readFileSync(`./${COUNTER}.json`))
  const time = Date.now()
  if (dict[username] && dict[username].chrissucks) {
    dict[username].chrissucks.push(time)
  } else if (dict[username]) {
    dict[username].chrissucks = [time]
  } else {
    dict[username] = {
      name: username,
      chrissucks: [time]
    }
  }
  const msg = 'ya'
  fs.writeFileSync(`./${COUNTER}.json`, JSON.stringify(dict))
  return msg
}
