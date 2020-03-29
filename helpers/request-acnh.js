const fs = require('fs')
const fetch = require('node-fetch')
const requestNintendo = require('./request-nintendo')
const { TOKEN_STORE } = require('../vars')

const auth = async ({ nintendoAccess, regToken }) => {
  // also reauths - no refresh needed
  const gameWebToken = requestNintendo.getGameWebToken(nintendoAccess, regToken, 'Animal Crossing: New Horizons')
  const requestOptionsUser = {
    headers: {
      cookie: `_gtoken=${gameWebToken}`
    }
  }
  console.log('--> Fetching ACNH user to retrieve user/island IDs.')
  const rawAcnhUserResponse = await fetch('https://web.sd.lp1.acbaa.srv.nintendo.net/api/sd/v1/users', requestOptionsUser)
  const acnhUserResponse = await rawAcnhUserResponse.json()
  const userId = acnhUserResponse.users[0].id
  const islandId = acnhUserResponse.users[0].land.id
  fs.writeFileSync(`./${TOKEN_STORE}/acnh-data-land`, islandId)

  const requestOptionsAuthToken = {
    method: 'post',
    headers: {
      cookie: `_gtoken=${nintendoAccess}`
    },
    body: JSON.stringify({
      userId
    })
  }

  console.log('--> Fetching ACNH auth_token.')
  const rawAcnhAuthTokenResponse = await fetch('https://web.sd.lp1.acbaa.srv.nintendo.net/api/sd/v1/auth_token')
  const acnhAuthTokenResponse = await rawAcnhAuthTokenResponse.json()
  fs.writeFileSync(`./${TOKEN_STORE}/acnh-access`, acnhAuthTokenResponse.token)
  return acnhAuthTokenResponse
}

const getInfo = async (accessToken, islandId, { retries = 2 } = {}) => {
  if (!retries) {
    console.log('** Too many Nintendo refresh attempts (ACNH)')
    return { error: 'Too many Nintendo refresh attempts.' }
  }
  const requestOptions = {
    headers: {
      authorization: `Bearer ${accessToken}`,
    }
  }
  let userRecordsResponse
  let islandRecordsResponse
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
      const nintendoAuthResponse = await auth({
        nintendoAccess: fs.readFileSync(`./${TOKEN_STORE}/nintendo-access`, 'utf8'),
        regToken: fs.readFileSync(`./${TOKEN_STORE}/nintendo-device`, 'utf8')
      })
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

const postKeyboard = async (accessToken, data, { retries = 2 } = {}) => {
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
      const nintendoAuthResponse = await auth({
        nintendoAccess: fs.readFileSync(`./${TOKEN_STORE}/spotify-refresh`, 'utf8'),
        regToken: fs.readFileSync(`./${TOKEN_STORE}/spotify-refresh`, 'utf8')
      })
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
