const fs = require('fs')
const { COUNTER } = require('../vars')

module.exports = function chrissucks({ username }) {
  // !chrissucks: send simple message while recording a score to a file
  try {
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
    fs.writeFileSync(`./${COUNTER}.json`, JSON.stringify(dict))
  } catch (e) {
    console.log('** error parsing counter (probably) in chrissucks chat command. will not write to file. continuing with proper msg back.', e)
  }
  const msg = `@${username} ya`
  return msg
}
