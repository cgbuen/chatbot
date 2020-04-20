const fs = require('fs')
const moment = require('moment')
const requestTwitch = require('../helpers/request-twitch')
const { TOKEN_STORE } = require('../vars')

module.exports = async function up() {
  let uptime
  try {
    const accessToken = fs.readFileSync(`./${TOKEN_STORE}/spotify-access`)
    const twitchStatsResponses = await requestTwitch.getAllStats(fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
    const startTime = moment(twitchStatsResponses.streamsResponse.data[0].startedAt)
    const currTime = moment()
    const duration = moment.duration(currTime.diff(startTime))
    uptime = `${duration.get('minutes')}m ${duration.get('seconds')}s`
    const hours = Math.floor(duration.as('hours'))
    if (hours) {
      uptime = `${hours}h ${uptime}`
    }
  } catch (e) {
    console.log('==> Could not retrieve uptime from Twitch')
    uptime = "n/a"
  }
  const msg = `stream up for ${uptime}`
  return msg
}
