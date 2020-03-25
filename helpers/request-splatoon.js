const fetch = require('node-fetch')
const moment = require('moment')

const getRecords = async (accessToken) => {
  const requestOptions = {
    headers: {
      cookie: `iksm_session=${accessToken}`,
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    }
  }
  let recordsResponse
  let xLeaderboardResponse
  let salmonRunResponse
  const now = moment(new Date())
  const nextMonth = now.clone().add(1, 'months')
  const yearMonthNow = `${now.format('YY')}${now.format('MM')}`
  const yearMonthNext = `${nextMonth.format('YY')}${nextMonth.format('MM')}`

  try {
    console.log('--> Fetching Splatoon records')
    const rawRecordsResponse = await fetch('https://app.splatoon2.nintendo.net/api/records', requestOptions)
    recordsResponse = await rawRecordsResponse.json()
    console.log('--> Fetching Splatoon X Leaderboard')
    const rawXLeaderboardResponse = await fetch(`${'https://app.splatoon2.nintendo.net'}/api/x_power_ranking/${yearMonthNow}01T00_${yearMonthNext}01T00/summary`, requestOptions)
    xLeaderboardResponse = await rawXLeaderboardResponse.json()
    const rawSalmonRunResponse = await fetch('https://app.splatoon2.nintendo.net/api/coop_results', requestOptions)
    salmonRunResponse = await rawSalmonRunResponse.json()
  } catch (e) {
    console.log('==> Request fetch Splatoon data', e)
    recordsResponse = {}
    xLeaderboardResponse = {}
  }
  return {
    recordsResponse,
    xLeaderboardResponse,
    salmonRunResponse
  }
}

module.exports = {
  getRecords
}
