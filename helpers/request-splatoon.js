const fs = require('fs')
const fetch = require('node-fetch')
const moment = require('moment')
const requestNintendo = require('./request-nintendo')
const { TOKEN_STORE, NINTENDO_SESSION } = require('../vars')

const auth = async (nintendoAccess) => {
  // also reauths - no refresh needed
  const gameWebToken = await requestNintendo.getGameWebToken(nintendoAccess, 'Splatoon 2')

  const requestOptionsSlash = {
    headers: {
      'x-gamewebtoken': gameWebToken
    }
  }
  console.log('--> Fetching slash path for Splatoon iksm token cookie.')
  const rawSlashResponse = await fetch('https://app.splatoon2.nintendo.net/?lang=en-US&na_country=US&na_lang=en-US', requestOptionsSlash)
  const slashResponseHeaders = rawSlashResponse.headers
  const iksmCookie = ((slashResponseHeaders.get('set-cookie') || '').match(/iksm_session=(.*?);/) || [])[1]
  console.log('--> Writing Splatoon token.')
  fs.writeFileSync(`./${TOKEN_STORE}/splatoon-access`, iksmCookie)
  return iksmCookie
}

const getRecords = async (accessToken, { retries = 2 } = {}) => {
  if (!retries) {
    console.log('** Too many Nintendo refresh attempts (Splatoon)')
    return { error: 'Too many Nintendo refresh attempts.' }
  }
  const requestOptions = {
    headers: {
      cookie: `iksm_session=${accessToken}`,
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    }
  }
  let recordsResponse = { records: {} }
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
    if (recordsResponse.code === 'AUTHENTICATION_ERROR') {
      console.log('--> Not successful. Refreshing.')
      const updatedToken = await auth(NINTENDO_SESSION)
      return await getRecords(updatedToken, { retries: retries - 1 })
    }
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
  auth,
  getRecords
}
