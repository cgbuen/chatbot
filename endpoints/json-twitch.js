const fs = require('fs')
const requestTwitch = require('../helpers/request-twitch')
const { TOKEN_STORE } = require('../vars')

module.exports = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const twitchStatsResponses = await requestTwitch.getAllStats(fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
  const twitchStats = {
    followers: twitchStatsResponses.followersResponse.follows,
    subscribers: twitchStatsResponses.subscriptionsResponse.subscriptions,
    bitsLeadersAlltime: twitchStatsResponses.bitsLeadersAlltimeResponse.data,
    bitsLeadersMonth: twitchStatsResponses.bitsLeadersMonthResponse.data,
    bitsLeadersWeek: twitchStatsResponses.bitsLeadersWeekResponse.data
  }
  return res.send(twitchStats)
}
