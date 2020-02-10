const fs = require('fs')
const bitRegExp = require('../helpers/bitRegExp')
const { COUNTER } = require('../vars')

module.exports = function bits({ username, message }) {
  // cheer: recording a score to a file
  const getAmount = msg => {
    let amount = 0
    const matcher = msg.match(bitRegExp)
    for (let i = 0; i < matcher.length; i++) {
      amount += parseInt(matcher[i].match(new RegExp(bitRegExp.source))[3])
    }
    return amount
  }

  const dict = JSON.parse(fs.readFileSync(`./${COUNTER}.json`))
  const amount = getAmount(message)
  if (dict[username] && dict[username].bits) {
    dict[username].bits += amount
  } else if (dict[username]) {
    dict[username].bits = amount
  } else {
    dict[username] = {
      name: username,
      bits: amount
    }
  }
  const msg = 'thx for the bits'
  fs.writeFileSync(`./${COUNTER}.json`, JSON.stringify(dict))
  return msg
}
