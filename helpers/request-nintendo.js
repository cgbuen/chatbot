const fs = require('fs')
const fetch = require('node-fetch')
const moment = require('moment')
const { TOKEN_STORE } = require('../vars')

const requestPlayer = async () => {
  const requestOptions = {
    headers: {
      cookie: `iksm_session=${fs.readFileSync(`./${TOKEN_STORE}/nintendo-access`, 'utf8')}`,
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    }
  }
  let nintendoResponseRecordsJson
  try {
    const nintendoResponseRecords = await fetch('https://app.splatoon2.nintendo.net/api/records', requestOptions)
    nintendoResponseRecordsJson = await nintendoResponseRecords.json()
  } catch (e) {
    nintendoResponseRecordsJson = { records: {} }
  }
  const records = nintendoResponseRecordsJson.records || {}
  const now = moment(new Date())
  const nextMonth = now.clone().add(1, 'months')
  const yearMonthNow = `${now.format('YY')}${now.format('MM')}`
  const yearMonthNext = `${nextMonth.format('YY')}${nextMonth.format('MM')}`
  console.log(yearMonthNow, yearMonthNext)
  // const nintendoResponseXLeaderboard = await fetch(`https://app.splatoon2.nintendo.net/api/x_power_ranking/${yearMonthNow}01T00_${yearMonthNext}01T00/summary`, requestOptions)
  // const nintendoResponseXLeaderboardJSON = await nintendoResponseXLeaderboard.json()
  return {
    player: records.player,
    win_count: records.win_count,
    lose_count: records.lose_count,
    // x_leaderboard: nintendoResponseXLeaderboardJSON 
  }
}

module.exports = {
  requestPlayer
}
