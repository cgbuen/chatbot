const fetch = require('node-fetch')
const qs = require('qs')
const { TOKEN_STORE } = require('../vars')

const getInitialTokenCreds = async (nintendoAccess) => {
  const nintendoClientId = '71b963c1b7b6d119'
  const nintendoGrantType = 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token'
  const requestOptions = {
    method: 'post',
    headers: {
      'content-type': 'application/json'
    }
  }
  console.log('--> Fetching initial token credentials (id_token) from /token.')
  const rawTokenResponse = await fetch('https://accounts.nintendo.com/connect/1.0.0/api/token', requestOptions)
  const tokenResponse = await rawTokenResponse.json()
  return tokenResponse
}

const getF = async ({ idToken, timestamp, requestId }) => {
  const requestOptionsHash = {
    method: 'post',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'user_agent/version.num'
    },
    body: qs.stringify({
      naIdToken: idToken
    })
  }
  console.log('--> Fetching hash from Eli Fessler\'s /gen2 s2s API.')
  const rawHashResponse = await fetch('https://elifessler.com/s2s/api/gen2', requestOptionsHash)
  const hashResponse = await rawHashResponse.json()
  const hash = hashResponse.hash
  const requestOptionsF = {
    headers: {
      'x-token': idToken,
      'x-time': timestamp,
      'x-guid': requestId,
      'x-hash': hash,
      'x-ver': 2,
      'x-iid': 'asdfgh'
    },
  }
  console.log('--> Fetching f token from Nexus\'s flapg API.')
  const rawFResponse = await fetch('https://flapg.com/ika2/api/login', requestOptionsF)
  const fResponse = await rawFResponse.json()
  return fResponse.f
}

const getHumanInfo = async (idToken) => {
  const requestOptions = {
    headers: {
      'authorization': `Bearer ${idToken}`
    }
  }
  console.log('--> Fetching human info from /me.')
  const rawHumanInfoResponse = await fetch('https://api.accounts.nintendo.com/2.0.0/users/me', requestOptions)
  const humanInfoResponse = await rawHumanInfoResponse.json()
  return humanInfoResponse
}

const getNintendoWebApiServerCredential = async ({ idToken, birthday, requestId, f }) => {
  const requestOptions = {
    method: 'post',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      parameter: {
        naIdToken: idToken,
        naIdCountry: 'US',
        naBirthday: birthday,
        language: 'en-US',
        requestId,
        f
      }
    })
  }
  console.log('--> Fetching WebApiServerCredential from /Login.')
  const rawLoginResponse = await fetch('https://api-lp1.znc.srv.nintendo.net/v1/Account/Login', requestOptions)
  const loginResponse = await rawLoginResponse.json()
  return loginResponse.result.webApiServerCredential.accessToken
}

const getGameList = async (bearerToken) => {
  const requestOptions = {
    method: 'post',
    headers: {
      'authorization': `Bearer ${bearerToken}`,
      'content-type': 'application/json'
    }
  }
  console.log('--> Fetching game list from /ListWebServices.')
  const rawGameListResponse = await fetch('https://api-lp1.znc.srv.nintendo.net/v1/Game/ListWebServices', requestOptions)
  const gameListResponse = await rawGameListResponse.json()
  const gameList = gameListResponse.result
  return gameList
}

const getWebServiceToken = async ({ id, bearerToken, regToken, requestId, timestamp, f }) => {
  const requestOptions = {
    method: 'post',
    headers: {
      'authorization': `Bearer ${bearerToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      id,
      registrationToken: regToken,
      requestId,
      timestamp,
      f
    })
  }
  console.log('--> Fetching WebServiceToken from /GetWebServiceToken.')
  const rawTokenResponse = await fetch('https://api-lp1.znc.srv.nintendo.net/v2/Game/GetWebServiceToken', requestOptions)
  const tokenResponse = await rawTokenResponse.json()
  return tokenResponse.result.accessToken
}

const getGameWebToken = async (nintendoAccess, regToken, game) => {
  const initialTokenCreds = await getInitialTokenCreds(nintendoAccess)

  const idToken = initialTokenCreds.id_token
  const requestIdLogin = uuid()
  const fLogin = await getF({
    timestamp: Date.now(),
    idToken,
    requestId: requestIdLogin
  })

  const birthday = await getHumanInfo(idToken).birthday

  const bearerToken = await getNintendoWebApiServerCredential({
    birthday,
    idToken,
    requestId: requestIdLogin,
    f: fLogin,
  })

  const requestIdWST = uuid()
  const fWST = await getF({
    timestamp: Date.now(),
    idToken,
    requestId: requestIdWST
  })

  const playerId = await getGameList(bearerToken).filter(x => x.name === game)[0].id

  return await getWebServiceToken({
    id: playerId,
    bearerToken: nintendoWebServerApiCredential,
    regToken,
    timestamp,
    requestId: requestIdWST,
    f: fWST
  })
}

module.exports = {
  getGameWebToken
}
