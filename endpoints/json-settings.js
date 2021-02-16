const fs = require('fs')

module.exports = (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')

  let data
  try {
    const { SETTINGS_TICKER } = JSON.parse(fs.readFileSync(`./command-content.json`))
    data = SETTINGS_TICKER
  } catch (e) {
    console.log('==> Could not parse command-content')
    build = 'n/a'
  }

  return res.send(data)
}
