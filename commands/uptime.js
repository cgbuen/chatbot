const moment = require('moment')

module.exports = function up({ chat, startTime }) {
  const currTime = moment()
  const duration = moment.duration(currTime.diff(startTime))
  let time = `${duration.get('minutes')}m ${duration.get('seconds')}s`
  const hours = Math.floor(duration.as('hours'))
  if (hours) {
    time = `${hours}h ${time}`
  }
  const msg = `stream up for ${time}`
  return msg
}
