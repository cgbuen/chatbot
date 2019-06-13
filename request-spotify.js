const fetch = require('node-fetch')
const qs = require('qs')
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = require('./vars')

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
      redirect_uri: 'http://localhost:3000/callback',
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
  } catch(e) {
    console.log('==> Request fetch error refresh', e)
    data = {
      error: 'fetch error: refresh'
    }
  }
  return data
}

const currentlyPlaying = async (accessToken) => {
  // actual api call for usable data
  const spotifyOptionsCurrentlyPlaying = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
  let data
  try {
    const spotifyResponseCurrentlyPlaying = await fetch('https://api.spotify.com/v1/me/player/currently-playing', spotifyOptionsCurrentlyPlaying)
    if (spotifyResponseCurrentlyPlaying.statusText === 'OK') {
      data = await spotifyResponseCurrentlyPlaying.json()
    } else {
      // non-OK response seems to imply no active session, so fake a "not
      // playing" response
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

module.exports = {
  auth,
  refresh,
  currentlyPlaying
}
