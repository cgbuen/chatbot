const fs = require('fs')
const fetch = require('node-fetch')
const qs = require('qs')
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, TOKEN_STORE } = require('../vars')

const auth = async (authCode) => {
  // initial authorization
  const spotifyOptionsAuth = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: qs.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'http://localhost:3000/callback-spotify',
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET
    })
  }
  let data
  try {
    const spotifyResponseAuth = await fetch('https://accounts.spotify.com/api/token', spotifyOptionsAuth)
    data = await spotifyResponseAuth.json()
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
  const spotifyOptionsRefresh = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET
    })
  }
  let data
  try {
    const spotifyResponseRefresh = await fetch('https://accounts.spotify.com/api/token', spotifyOptionsRefresh)
    data = await spotifyResponseRefresh.json()
    fs.writeFileSync(`./${TOKEN_STORE}/spotify-access`, data.access_token)
  } catch(e) {
    console.log('==> Request fetch error refresh', e)
    data = {
      error: 'fetch error: refresh'
    }
  }
  return data
}

const currentlyPlaying = async (accessToken, { retries = 3 } = {}) => {
  // actual api call for usable data
  let data
  if (!retries) {
    console.log('** too many spotify currently playing refresh attempts')
    data = { error: 'Too many Currently Playing refresh attempts.', is_playing: false, noSession: true }
    return data
  }

  const spotifyOptionsCurrentlyPlaying = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
  try {
    console.log('--> Fetching Spotify playing data')
    const spotifyResponseCurrentlyPlaying = await fetch('https://api.spotify.com/v1/me/player', spotifyOptionsCurrentlyPlaying)
    if (spotifyResponseCurrentlyPlaying.statusText === 'OK') {
      console.log('** OK currently playing response data')
      data = await spotifyResponseCurrentlyPlaying.json()
    } else if (spotifyResponseCurrentlyPlaying.statusText === 'Unauthorized') {
      console.log('** Unauthorized currently playing response data')
      const spotifyTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/spotify-refresh`, 'utf8'))
      data = await currentlyPlaying(spotifyTokenDataUpdated.access_token, { retries: retries - 1 }) // try again now that tokens are updated
    } else {
      // other non-OK response seems to imply no active session, so fake a "not
      // playing" response
      console.log('** non-OK currently playing response')
      data = { is_playing: false, noSession: true }
    }
  } catch (e) {
    console.log('==> Request fetch error currently playing', e)
    data = {
      error: 'fetch error: currently playing'
    }
  }
  return data
}

const devices = async (accessToken, { retries = 3 } = {}) => {
  // actual api call for usable data
  let data
  if (!retries) {
    console.log('** too many spotify device refresh attempts')
    data = { error: 'Too many Devices refresh attempts.', is_playing: false, noSession: true }
    return data
  }
  const spotifyOptionsCurrentlyPlaying = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
  try {
    const spotifyResponseDevices = await fetch('https://api.spotify.com/v1/me/player/devices', spotifyOptionsCurrentlyPlaying)
    if (spotifyResponseDevices.statusText === 'OK') {
      console.log('** OK device response data')
      data = await spotifyResponseDevices.json()
    } else if (spotifyResponseDevices.statusText === 'Unauthorized') {
      console.log('** Unauthorized device response data')
      const spotifyTokenDataUpdated = await refresh(fs.readFileSync(`./${TOKEN_STORE}/spotify-refresh`, 'utf8'))
      data = await devices(spotifyTokenDataUpdated.access_token, { retries: retries - 1 }) // try again after tokens updated
    } else {
      // non-OK response seems to imply no active session, so fake a "not
      // playing" response
      console.log('** non-OK device response')
      data = []
    }
  } catch (e) {
    console.log('==> Request fetch error devices', e)
    data = []
  }
  return data
}

module.exports = {
  auth,
  refresh,
  currentlyPlaying,
  devices
}
