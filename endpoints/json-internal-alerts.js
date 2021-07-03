const fs = require('fs')
const moment = require('moment')
const { COUNTER } = require('../vars')
const unbreak = require('../helpers/unbreak')

module.exports = (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const newNotifications = fs.readFileSync(`./${ALERTS}.json`)
  return res.send(newNotifications)
}
