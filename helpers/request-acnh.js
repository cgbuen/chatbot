const fs = require('fs')
const fetch = require('node-fetch')
const requestNintendo = require('./request-nintendo')
const { TOKEN_STORE } = require('../vars')

const auth = async (nintendoAccess) => {
  // also reauths - no refresh needed
  const gameWebToken = await requestNintendo.getGameWebToken(nintendoAccess, 'Animal Crossing: New Horizons')
  const requestOptionsUser = {
    headers: {
      cookie: `_gtoken=${gameWebToken}`
    }
  }
  console.log('--> Fetching ACNH user to retrieve user/island IDs.')
  const rawAcnhUserResponse = await fetch('https://web.sd.lp1.acbaa.srv.nintendo.net/api/sd/v1/users', requestOptionsUser)
  const acnhUserResponse = await rawAcnhUserResponse.json()
  const user = (acnhUserResponse.users || [])[0]
  const userId = (user || {}).id
  const islandId = ((user || {}).land || {}).id
  fs.writeFileSync(`./${TOKEN_STORE}/acnh-data-land`, islandId)

  const requestOptionsAuthToken = {
    method: 'post',
    headers: {
      cookie: `_gtoken=${gameWebToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      userId
    })
  }
  console.log('--> Fetching ACNH auth_token.')
  const rawAcnhAuthTokenResponse = await fetch('https://web.sd.lp1.acbaa.srv.nintendo.net/api/sd/v1/auth_token', requestOptionsAuthToken)
  const acnhAuthTokenResponse = await rawAcnhAuthTokenResponse.json()
  fs.writeFileSync(`./${TOKEN_STORE}/acnh-access`, acnhAuthTokenResponse)
  return acnhAuthTokenResponse
}

const getInfo = async (accessToken, islandId, { retries = 1 } = {}) => {
  if (!retries) {
    console.log('** Too many Nintendo refresh attempts (ACNH)')
    return { error: 'Too many Nintendo refresh attempts.' }
  }
  const requestOptions = {
    headers: {
      authorization: `Bearer ${accessToken}`,
    }
  }
  let userRecordsResponse = {}
  let islandRecordsResponse = {}
  try {
    console.log('--> Fetching Island records')
    const rawIslandRecordsResponse = await fetch(`${'https://web.sd.lp1.acbaa.srv.nintendo.net'}/api/sd/v1/lands/${islandId}/profile?language=en-US`, requestOptions)
    islandRecordsResponse = await rawIslandRecordsResponse.json()
    if (!islandRecordsResponse.code) {
      const { userId } = islandRecordsResponse.mVillager[0]
      console.log('--> Fetching User records')
      const rawUserRecordsResponse = await fetch(`${'https://web.sd.lp1.acbaa.srv.nintendo.net'}/api/sd/v1/users/${userId}/profile?language=en-US`, requestOptions)
      userRecordsResponse = await rawUserRecordsResponse.json()
    } else {
      console.log('==> Error getting island response. Has code:', islandRecordsResponse.code)
      const nintendoAccess = (fs.readFileSync(`./${TOKEN_STORE}/nintendo-access`, 'utf8') || '').trim()
      const nintendoAuthResponse = await auth(nintendoAccess)
      return await getInfo(nintendoAuthResponse.token, islandId, { retries: retries - 1})
    }
  } catch (e) {
    console.log('==> Request fetch ACNH data error', e)
  }
  return {
    userRecordsResponse,
    islandRecordsResponse
  }
}

const postKeyboard = async (accessToken, data, { retries = 1 } = {}) => {
  if (!retries) {
    console.log('** Too many Nintendo refresh attempts')
    return { error: 'Too many Nintendo refresh attempts.' }
  }
  const requestOptions = {
    method: 'post',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      type: 'keyboard',
      body: data.substring(0, 32)
    })
  }

  try {
    console.log('--> POSTing user channel points message to ACNH')
    const rawKeyboardPostResponse = await fetch('https://web.sd.lp1.acbaa.srv.nintendo.net/api/sd/v1/messages', requestOptions)
    const keyboardPostResponse = await rawKeyboardPostResponse.json()
    console.log('--> ACNH keyboard POST response:', keyboardPostResponse)
    if (keyboardPostResponse.status !== 'success') {
      console.log('--> Not successful. Refreshing.')
      const nintendoAccess = fs.readFileSync(`./${TOKEN_STORE}/spotify-refresh`, 'utf8')
      const nintendoAuthResponse = await auth(nintendoAccess)
      return await postKeyboard(nintendoAuthResponse.token, data, { retries: retries - 1 })
    }
  } catch (e) {
    console.log('==> ACNH keyboard POST error', e)
  }

  return
}

module.exports = {
  getInfo,
  postKeyboard
}
