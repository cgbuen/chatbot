const fs = require('fs')
const { ALERTS, BOT_USER, CHANNEL, TOKEN_STORE } = require('../vars')

module.exports = async (req, res) => {
  const alertsQueue = JSON.parse(fs.readFileSync(`./${ALERTS}.json`))
  const e = req.body
  alertsQueue.unshift({ eventName: e.subscription.type, eventDetails: e.event })
  fs.writeFileSync(`./${ALERTS}.json`, JSON.stringify(alertsQueue))
  res.sendStatus(200)
}
