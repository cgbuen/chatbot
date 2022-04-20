const fs = require('fs')
const moment = require('moment')
const requestTwitch = require('../helpers/request-twitch')
const { CHANNEL, TOKEN_STORE } = require('../vars')
const unbreak = require('../helpers/unbreak')

module.exports = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  let twitchStats
  try {
    const twitchStatsResponses = await requestTwitch.getAllStats(fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
    const followers = twitchStatsResponses.followersResponse.data
    const subs =  twitchStatsResponses.subscriptionsResponse.data
    const bits = {
      alltime: twitchStatsResponses.bitsLeadersAlltimeResponse.data,
      month: twitchStatsResponses.bitsLeadersMonthResponse.data,
      week: twitchStatsResponses.bitsLeadersWeekResponse.data
    }
    let uptime
    try {
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
    twitchStats = {
      followers,
      subs,
      bits,
      uptime,
      output_followers: `[Latest Followers] ${followers.map((x, i) => unbreak(`${i + 1}. ${x.fromName}`)).join(', ')}`,
      output_subs: `[Newest Subscribers] ${subs.filter(x => x.userName !== CHANNEL).map((x, i) => unbreak(`${i + 1}. ${x.userName}`)).join(', ')}`,
      output_bits: {
        alltime: `[Bit Leaders (All-Time)] ${bits.alltime.map((x, i) => unbreak(`${i + 1}. ${x.userName} (${x.score})`)).join(', ')}`,
        month: `[Bit Leaders (Month)] ${bits.month.map((x, i) => unbreak(`${i + 1}. ${x.userName} (${x.score})`)).join(', ') || '1. No one'}`,
        week: `[Bit Leaders (Week)] ${bits.week.map((x, i) => unbreak(`${i + 1}. ${x.userName} (${x.score})`)).join(', ') || '1. No one'}`,
      },
      output_uptime: `[Uptime] Stream up for ${uptime}`
    }
  } catch (e) {
    console.log('==> Error receiving Twitch stats', e)
    twitchStats = {}
  }
  return res.send(twitchStats)
}
