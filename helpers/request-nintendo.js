const fetch = require('node-fetch')
const qs = require('qs')
const uuid = require('uuid')
const { TOKEN_STORE } = require('../vars')

const getInitialTokenCreds = async (nintendoAccess) => {
  const nintendoClientId = '71b963c1b7b6d119' // hardcoded
  const nintendoGrantType = 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token' // hardcoded
  const requestOptions = {
    method: 'post',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      client_id: nintendoClientId,
      session_token: nintendoAccess,
      grant_type: nintendoGrantType
    })
  }
  console.log('--> Fetching initial token credentials (id_token) from /token.')
  const rawTokenResponse = await fetch('https://accounts.nintendo.com/connect/1.0.0/api/token', requestOptions)
  const tokenResponse = await rawTokenResponse.json()
  return tokenResponse
}

const getHumanInfo = async (bearerToken) => {
  const requestOptions = {
    headers: {
      'authorization': `Bearer ${bearerToken}`
    }
  }
  console.log('--> Fetching human info from /me.')
  const rawHumanInfoResponse = await fetch('https://api.accounts.nintendo.com/2.0.0/users/me', requestOptions)
  const humanInfoResponse = await rawHumanInfoResponse.json()
  return humanInfoResponse
}

const getF = async ({ naIdToken, timestamp, requestId, iid }) => {
  const requestOptionsHash = {
    method: 'post',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'cgbuen/1.0.0'
    },
    body: qs.stringify({
      naIdToken,
      timestamp
    })
  }
  console.log('--> Fetching hash from Eli Fessler\'s /gen2 s2s API.')
  const rawHashResponse = await fetch('https://elifessler.com/s2s/api/gen2', requestOptionsHash)
  const hashResponse = await rawHashResponse.json()
  const hash = hashResponse.hash
  const requestOptionsF = {
    headers: {
      'x-token': naIdToken,
      'x-time': timestamp + '',
      'x-guid': requestId,
      'x-hash': hash,
      'x-ver': '3',
      'x-iid': iid
    },
  }
  console.log('--> Fetching f token from Nexus\'s flapg', iid, 'API.')
  const rawFResponse = await fetch('https://flapg.com/ika2/api/login?public', requestOptionsF)
  const fResponse = await rawFResponse.json()
  return fResponse
}

const getNintendoWebApiServerCredential = async (parameter) => {
  const requestOptions = {
    method: 'post',
    headers: {
      'content-type': 'application/json',
      'x-productversion': '1.10.1',
      'x-platform': 'Android', // must be android due to flapg
    },
    body: JSON.stringify({ parameter })
  }
  console.log('--> Fetching WebApiServerCredential from /Login.')
  const rawLoginResponse = await fetch('https://api-lp1.znc.srv.nintendo.net/v1/Account/Login', requestOptions)
  const loginResponse = await rawLoginResponse.json()
  return loginResponse
}

const getGameList = async (bearerToken) => {
  const requestOptions = {
    method: 'post',
    headers: {
      'authorization': `Bearer ${bearerToken}`,
      'content-type': 'application/json',
      'x-productversion': '1.9.0',
      'x-platform': 'Android', // must be android due to flapg
    }
  }
  console.log('--> Fetching game list from /ListWebServices.')
  const rawGameListResponse = await fetch('https://api-lp1.znc.srv.nintendo.net/v1/Game/ListWebServices', requestOptions)
  const gameListResponse = await rawGameListResponse.json()
  return gameListResponse
}

const getWebServiceToken = async (bearerToken, parameter) => {
  const requestOptions = {
    method: 'post',
    headers: {
      'authorization': `Bearer ${bearerToken}`,
      'content-type': 'application/json',
      'x-productversion': '1.9.0',
      'x-platform': 'Android', // must be android due to flapg
    },
    body: JSON.stringify({ parameter })
  }
  console.log('--> Fetching WebServiceToken from /GetWebServiceToken.')
  const rawTokenResponse = await fetch('https://api-lp1.znc.srv.nintendo.net/v2/Game/GetWebServiceToken', requestOptions)
  const tokenResponse = await rawTokenResponse.json()
  return tokenResponse
}

const getGameWebToken = async (nintendoAccess, game) => {
  const initialTokenCreds = await getInitialTokenCreds(nintendoAccess)

  const fLogin = await getF({
    timestamp: Math.floor(Date.now()/1000),
    naIdToken: initialTokenCreds.access_token,
    requestId: uuid.v4(),
    iid: 'nso'
  })

  const humanInfo = await getHumanInfo(initialTokenCreds.access_token)

  const bearerTokenResponse = await getNintendoWebApiServerCredential({
    naIdToken: fLogin.result.p1,
    naCountry: humanInfo.country,
    naBirthday: humanInfo.birthday,
    language: humanInfo.language,
    requestId: fLogin.result.p3,
    timestamp: parseInt(fLogin.result.p2),
    f: fLogin.result.f,
  })

  const bearerToken = bearerTokenResponse.result.webApiServerCredential.accessToken

  const fWST = await getF({
    timestamp: parseInt(fLogin.result.p2),
    naIdToken: bearerToken,
    requestId: fLogin.result.p3,
    iid: 'app'
  })

  const gameList = await getGameList(bearerToken)

  const webServiceTokenResponse = await getWebServiceToken(bearerToken, {
    id: gameList.result.filter(x => x.name === game)[0].id,
    registrationToken: fWST.result.p1,
    timestamp: parseInt(fWST.result.p2),
    requestId: fWST.result.p3,
    f: fWST.result.f
  })

  return webServiceTokenResponse.result.accessToken
}

module.exports = {
  getGameWebToken
}
