const fs = require('fs')
const fetch = require('node-fetch')
const TwitchJs = require('twitch-js').default
const qs = require('qs')
const { BOT_USER, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = require('../vars')

const auth = async (authCode) => {
  // initial authorization
  const twitchOptionsAuth = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: qs.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'http://localhost:3000/twitch-callback',
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET
    })
  }
  let data
  try {
    const twitchResponseAuth = await fetch('https://id.twitch.tv/oauth2/token', twitchOptionsAuth)
    data = await twitchResponseAuth.json()
  } catch (e) {
    console.log('==> Request fetch error auth', e)
    data = {
      error: 'fetch error: auth'
    }
  }
  return data
}

const refresh = async (refreshToken) => {
  // refresh token for new access tokens
  const twitchOptionsRefresh = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET
    })
  }
  let data
  try {
    const twitchResponseRefresh = await fetch('https://id.twitch.tv/oauth2/token', twitchOptionsRefresh)
    data = await twitchResponseRefresh.json()
    fs.writeFileSync('./token-store/twitch-access', data.access_token)
    fs.writeFileSync('./token-store/twitch-refresh', data.refresh_token)
  } catch(e) {
    console.log('==> Request fetch error refresh', e)
    data = {
      error: 'fetch error: refresh'
    }
  }
  return data
}

const lookupUser = async (accessToken, userInput, { retries = 3 } = {}) => {
  let data
  if (!retries) {
    console.log('** too many twitch stats refresh attempts')
    data = { error: 'Too many User Lookup refresh attempts.', }
    return data
  }
  try {
    const { api } = new TwitchJs({
      token: accessToken,
      username: BOT_USER
    })
    const userResponse = await api.get('users', { version: 'helix', search: { login: userInput} })
    data = userResponse.data
  } catch (e) {
    console.log('==> Request twitch lookupUser api fetch error', e)
    if (e.body.error === 'Unauthorized') {
      console.log('** Unauthorized getAllStats response data')
      const twitchTokenDataUpdated = await refresh(fs.readFileSync('./token-store/twitch-refresh', 'utf8'))
      data = await lookupUser(twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      console.log('** Error')
      data = []
    }
  }
  return data
}

const getAllStats = async (accessToken, { retries = 3 } = {}) => {
  let data
  if (!retries) {
    console.log('** too many twitch stats refresh attempts')
    data = { error: 'Too many Stats refresh attempts.', }
    return data
  }
  try {
    const { api } = new TwitchJs({
      token: accessToken,
      username: BOT_USER
    })
    const users = await api.get('users', { version: 'helix', search: { login: BOT_USER } })
    const subs = await api.get('subscriptions', { version: 'helix', search: { broadcaster_id: users.data[0].id } })
    data = {
      subs
    }
  } catch (e) {
    console.log('==> Request twitch getAllStats api fetch error', e)
    if (e.body.error === 'Unauthorized') {
      console.log('** Unauthorized getAllStats response data')
      const twitchTokenDataUpdated = await refresh(fs.readFileSync('./token-store/twitch-refresh', 'utf8'))
      data = await getAllStats(twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      data = {
        error: 'twitch api fetch error: stats'
      }
    }
  }
  return data
}

module.exports = {
  auth,
  refresh,
  lookupUser,
  getAllStats
}
