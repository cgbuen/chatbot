const fs = require('fs')
const moment = require('moment')
const fetch = require('node-fetch')
const TwitchJs = require('twitch-js').default
const qs = require('qs')
const { BOT_USER, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TOKEN_STORE } = require('../vars')

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
      redirect_uri: 'http://localhost:3000/callback-twitch',
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
    console.log(data)
    fs.writeFileSync(`./${TOKEN_STORE}/twitch-access`, data.access_token)
    fs.writeFileSync(`./${TOKEN_STORE}/twitch-refresh`, data.refresh_token)
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
    data = await api.get('users', { version: 'helix', search: { login: userInput } })
  } catch (e) {
    console.log('==> Request twitch lookupUser api fetch error', e)
    if (e.body.error === 'Unauthorized') {
      console.log('** Unauthorized getAllStats response data')
      const twitchTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
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
    const user = users.data[0].id
    const followersResponse = await api.get(`channels/${user}/follows`, {
      version: 'kraken',
      search: {
        directions: 'asc',
        limit: 5
      }
    })
    const subscriptionsResponse = await api.get(`channels/${user}/subscriptions`, {
      version: 'kraken',
      search: {
        direction: 'asc',
        limit: 5
      }
    })
    const bitsLeadersAlltimeResponse = await api.get('bits/leaderboard', {
      version: 'helix'
    })
    const bitsLeadersMonthResponse = await api.get('bits/leaderboard', {
      version: 'helix',
      search: {
        period: 'month',
        started_at: moment().startOf('month').format()
      }
    })
    const bitsLeadersWeekResponse = await api.get('bits/leaderboard', {
      version: 'helix',
      search: {
        period: 'week',
        started_at: moment().startOf('week').format()
      }
    })
    data = {
      followersResponse,
      subscriptionsResponse,
      bitsLeadersAlltimeResponse,
      bitsLeadersMonthResponse,
      bitsLeadersWeekResponse
    }
  } catch (e) {
    console.log('==> Request twitch getAllStats api fetch error', e)
    if (e.body.error === 'Unauthorized') {
      console.log('** Unauthorized getAllStats response data')
      const twitchTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
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
