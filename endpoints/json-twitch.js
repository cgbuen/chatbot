const fs = require('fs')
const requestTwitch = require('../helpers/request-twitch')
const { CHANNEL, TOKEN_STORE } = require('../vars')

module.exports = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const twitchStatsResponses = await requestTwitch.getAllStats(fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
  const followers = twitchStatsResponses.followersResponse.follows
  const subs =  twitchStatsResponses.subscriptionsResponse.subscriptions
  const bits = {
    alltime: twitchStatsResponses.bitsLeadersAlltimeResponse.data,
    month: twitchStatsResponses.bitsLeadersMonthResponse.data,
    week: twitchStatsResponses.bitsLeadersWeekResponse.data
  }
  const twitchStats = {
    followers,
    subs,
    bits,
    output_followers: `Latest Followers: ${followers.map((x, i) => `${i + 1}. ${x.user.displayName}`).join(', ')}`,
    output_subs: `Latest New Subscribers: ${subs.filter(x => x.user.displayName !== CHANNEL).map((x, i) => `${i + 1}. ${x.user.displayName}`).join(', ')}`,
    output_bits: {
      alltime: `Bit Leaders (All-Time): ${bits.alltime.map((x, i) => `${i + 1}. ${x.userName} (${x.score})`).join(', ')}`,
      month: `Bit Leaders (Month): ${bits.month.map((x, i) => `${i + 1}. ${x.userName} (${x.score})`).join(', ') || '1. No one'}`,
      week: `Bit Leaders (Week): ${bits.week.map((x, i) => `${i + 1}. ${x.userName} (${x.score})`).join(', ') || '1. No one'}`,
    }
  }
  return res.send(twitchStats)
}
