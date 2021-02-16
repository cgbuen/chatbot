const fs = require('fs')

module.exports = function socials(message) {
  let msg
  try {
    const { SOCIALS_ALL, SOCIALS_IG, SOCIALS_TWITTER } = JSON.parse(fs.readFileSync('./command-content.json', 'utf8').trim())
    if (message === '!instagram') {
      msg = SOCIALS_IG
    } else if (message === '!twitter') {
      msg = SOCIALS_TWITTER
    } else {
      msg = SOCIALS_ALL
    }
  } catch (e) {
    console.log('==> Could not parse command-content')
    msg = 'n/a'
  }
  return msg
}
