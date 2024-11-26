const fs = require('fs')
const moment = require('moment')
const requestTwitch = require('../helpers/request-twitch')
const { TOKEN_STORE } = require('../vars')

module.exports = async function followage({ username }) {
  try {
    const twitchFollowResponse = await requestTwitch.getFollowAge(username, fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
    const followedAtData = twitchFollowResponse && twitchFollowResponse.data && twitchFollowResponse.data[0] && twitchFollowResponse.data[0].followedAt
    if (!followedAtData) {
      return `@${username} is not following`
    } else {
      const currTime = moment()
      const fdObj = moment(followedAtData)
      const durObj = moment.duration(currTime.diff(fdObj))
      
      const followDate = fdObj.format('MMMM DD YYYY')
      const duration = Math.floor(durObj.asDays())
      if (duration <= 0) {
        return `@${username} started following today, ${followDate}`
      } else if (duration === 1) {
        return `@${username} started following yesterday, ${followDate}`
      } else {
        return `@${username} started following on ${followDate}, ${duration} days ago`
      }
    }
  } catch (e) {
    console.log('** error ', e)
    return 'n/a'
  }
}
