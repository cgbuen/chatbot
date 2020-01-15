const fetch = require('node-fetch')
const { IKSM_TOKEN } = require('./vars')
const moment = require('moment')

const requestPlayer = async () => {
  const requestOptions = {
    headers: {
      cookie: `iksm_session=${IKSM_TOKEN}`,
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    }
  }
  const nintendoResponseRecords = await fetch('https://app.splatoon2.nintendo.net/api/records', requestOptions)
  const nintendoResponseRecordsJson = await nintendoResponseRecords.json()
  const records = nintendoResponseRecordsJson.records
  const now = moment(new Date())
  const nextMonth = now.clone().add(1, 'months')
  const yearMonthNow = `${now.format('YY')}${now.format('MM')}`
  const yearMonthNext = `${nextMonth.format('YY')}${nextMonth.format('MM')}`
  console.log(yearMonthNow, yearMonthNext)
  const nintendoResponseXLeaderboard = await fetch(`https://app.splatoon2.nintendo.net/api/x_power_ranking/${yearMonthNow}01T00_${yearMonthNext}01T00/summary`, requestOptions)
  const nintendoResponseXLeaderboardJSON = await nintendoResponseXLeaderboard.json()
  return {
    player: records.player,
    win_count: records.win_count,
    lose_count: records.lose_count,
    x_leaderboard: nintendoResponseXLeaderboardJSON 
  }
}

module.exports = {
  requestPlayer
}
