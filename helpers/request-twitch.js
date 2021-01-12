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
    console.log('--> Writing Twitch tokens.')
    fs.writeFileSync(`./${TOKEN_STORE}/twitch-access`, data.access_token)
    fs.writeFileSync(`./${TOKEN_STORE}/twitch-refresh`, data.refresh_token)
    if (!fs.existsSync(`./${TOKEN_STORE}/twitch-data-user`)) {
      console.log('--> Requesting user ID')
      await getOwnUserId(data.access_token)
    }
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
    console.log('==> Too many Twitch user lookup refresh attempts error')
    data = { error: 'Too many User Lookup refresh attempts.', }
    return data
  }
  try {
    const { api } = new TwitchJs({
      token: accessToken,
      username: BOT_USER
    })
    data = await api.get('users', {
      version: 'helix',
      headers: {
        'client-id': TWITCH_CLIENT_ID,
      },
      search: { login: userInput }
    })
  } catch (e) {
    console.log('==> Request Twitch lookupUser api fetch error', e)
    if (e.body.error === 'Unauthorized') {
      console.log('==> Unauthorized getAllStats response data')
      const twitchTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
      data = await lookupUser(twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      console.log('==> Miscellaneous Twitch user lookup error', e)
      data = []
    }
  }
  return data
}

const getOwnUserId = async (accessToken, { retries = 3 } = {}) => {
  let data
  if (!retries) {
    console.log('==> Too many Twitch user ID refresh attempts error')
    data = { error: 'Too many Stats refresh attempts.' }
    return data
  }
  try {
    const { api } = new TwitchJs({
      token: accessToken,
      username: BOT_USER
    })
    console.log('--> Beginning Twitch user fetch to find out own user ID')
    const users = await api.get('users', { version: 'helix', search: { login: BOT_USER } })
    data = users.data[0].id
    console.log('--> Writing Twitch user info.')
    fs.writeFileSync(`./${TOKEN_STORE}/twitch-data-user`, data)
  } catch (e) {
    if (e.body.error === 'Unauthorized') {
      console.log('==> Unauthorized getOwnUserId response data error', e)
      const twitchTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
      data = await getAllStats(twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      data = {
        error: 'twitch api fetch error: getOwnUserId'
      }
    }
  }
  return data
}

const getAllStats = async (accessToken, { retries = 3 } = {}) => {
  let data
  if (!retries) {
    console.log('==> Too many Twitch stats refresh attempts error')
    data = { error: 'Too many Stats refresh attempts.', }
    return data
  }
  try {
    const { api } = new TwitchJs({
      token: accessToken,
      username: BOT_USER
    })
    console.log('--> Beginning sequential Twitch fetches: 1. followers, 2. subs, 3-5. bits (alltime/month/week)')
    const user = (fs.readFileSync(`./${TOKEN_STORE}/twitch-data-user`, 'utf8') || '').trim()
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
        direction: 'desc',
        limit: 5
      }
    })
    const bitsLeadersAlltimeResponse = await api.get('bits/leaderboard', {
      version: 'helix',
      headers: {
        'client-id': TWITCH_CLIENT_ID,
      }
    })
    const bitsLeadersMonthResponse = await api.get('bits/leaderboard', {
      version: 'helix',
      headers: {
        'client-id': TWITCH_CLIENT_ID,
      },
      search: {
        period: 'month',
        started_at: moment().startOf('month').format()
      }
    })
    const bitsLeadersWeekResponse = await api.get('bits/leaderboard', {
      version: 'helix',
      headers: {
        'client-id': TWITCH_CLIENT_ID,
      },
      search: {
        period: 'week',
        started_at: moment().startOf('week').format()
      }
    })
    const streamsResponse = await api.get('streams', {
      version: 'helix',
      headers: {
        'client-id': TWITCH_CLIENT_ID,
      },
      search: {
        user_id: user
      }
    })
    data = {
      followersResponse,
      subscriptionsResponse,
      bitsLeadersAlltimeResponse,
      bitsLeadersMonthResponse,
      bitsLeadersWeekResponse,
      streamsResponse
    }
  } catch (e) {
    console.log('==> Request twitch getAllStats api fetch error', e)
    if (e.body.error === 'Unauthorized' || e.body.error === 'Bad Request') {
      console.log('==> Unauthorized getAllStats response data error')
      const twitchTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
      data = await getAllStats(twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      console.log('==> Uncaught getAllStats error', e)
      data = {
        error: 'twitch api fetch error: stats'
      }
    }
  }
  return data
}

const getMods = async (accessToken, { retries = 3 } = {}) => {
  let data
  if (!retries) {
    console.log('==> Too many Twitch mod fetching attempts error')
    data = { error: 'Too many mod fetching attempts.' }
    return data
  }
  try {
    const { api } = new TwitchJs({
      token: accessToken,
      username: BOT_USER
    })
    console.log('--> Beginning Twitch fetch mods list')
    data = await api.get('moderation/moderators', {
      version: 'helix',
      headers: {
        'client-id': TWITCH_CLIENT_ID,
      },
      search: {
        broadcaster_id: (fs.readFileSync(`./${TOKEN_STORE}/twitch-data-user`, 'utf8') || '').trim()
      }
    })
  } catch (e) {
    if (e.body.error === 'Unauthorized') {
      console.log('==> Unauthorized getMods response data error', e)
      const twitchTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
      data = await getMods(twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      console.log('==> Uncaught getMods error', e)
      data = {
        error: 'twitch api fetch error: getMods'
      }
    }
  }
  return data
}

const getGame = async (gameName, accessToken, { retries = 3 } = {}) => {
  let data
  if (!retries) {
    console.log('==> Too many Twitch game id fetching attempts error')
    data = { error: 'Too many game id fetching attempts.' }
    return data
  }
  try {
    const { api } = new TwitchJs({
      token: accessToken,
      username: BOT_USER
    })
    console.log('--> Beginning Twitch fetch game id', gameName)
    data = await api.get('games', {
      version: 'helix',
      headers: {
        'client-id': TWITCH_CLIENT_ID,
      },
      search: {
        name: gameName
      }
    })
  } catch (e) {
    if (e.body && e.body.error === 'Unauthorized') {
      console.log('==> Unauthorized getGame response data error', e)
      const twitchTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
      data = await getGame(gameName, twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      console.log('==> Uncaught getGame error', e)
      data = {
        error: 'twitch api fetch error: getGame'
      }
    }
  }
  return data
}

const setGame = async (gameId, accessToken, { retries = 3 } = {}) => {
  let data
  if (!retries) {
    console.log('==> Too many Twitch game setting attempts error')
    data = { error: 'Too many game setting attempts.' }
    return data
  }
  try {
    console.log('--> Beginning Twitch game name setting')
    // need to use node-fetch due to twitch-js lack of PATCH request support
    data = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${(fs.readFileSync(`./${TOKEN_STORE}/twitch-data-user`, 'utf8') || '').trim()}`, {
      method: 'PATCH',
      headers: {
        'client-id': TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ game_id: gameId })
    })
  } catch (e) {
    if (e.body.error === 'Unauthorized') {
      console.log('==> Unauthorized setGame response data error', e)
      const twitchTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
      data = await setGame(gameId, twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      console.log('==> Uncaught setGame error', e)
      data = {
        error: 'twitch api fetch error: setGame'
      }
    }
  }
  return data
}

const setTitle = async (title, accessToken, { retries = 3 } = {}) => {
  let data
  if (!retries) {
    console.log('==> Too many Twitch title setting attempts error')
    data = { error: 'Too many title setting attempts.' }
    return data
  }
  try {
    const { api } = new TwitchJs({
      token: accessToken,
      username: BOT_USER
    })
    console.log('--> Beginning Twitch title setting')
    // need to use node-fetch due to twitch-js lack of PATCH request support
    data = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${(fs.readFileSync(`./${TOKEN_STORE}/twitch-data-user`, 'utf8') || '').trim()}`, {
      method: 'PATCH',
      headers: {
        'client-id': TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ title })
    })
  } catch (e) {
    if (e.body.error === 'Unauthorized') {
      console.log('==> Unauthorized setTitle response data error', e)
      const twitchTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/twitch-refresh`, 'utf8'))
      data = await setTitle(title, twitchTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      console.log('==> Uncaught setTitle error', e)
      data = {
        error: 'twitch api fetch error: setTitle'
      }
    }
  }
  return data
}

module.exports = {
  auth,
  refresh,
  lookupUser,
  getOwnUserId,
  getAllStats,
  getMods,
  getGame,
  setGame,
  setTitle
}
