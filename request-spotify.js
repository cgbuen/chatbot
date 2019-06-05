const fetch = require('node-fetch')
const qs = require('qs')
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = require('./vars')

const requestSpotifyAuth = async (authCode) => {
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
  const spotifyResponseAuth = await fetch('https://accounts.spotify.com/api/token', spotifyOptionsAuth)
  return await spotifyResponseAuth.json()
}

const requestSpotifyRefresh = async (refreshToken) => {
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
  const spotifyResponseRefresh = await fetch('https://accounts.spotify.com/api/token', spotifyOptionsRefresh)
  return await spotifyResponseRefresh.json()
}

const requestSpotifyCurrentlyPlaying = async (accessToken) => {
  const spotifyOptionsCurrentlyPlaying = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
  const spotifyResponseCurrentlyPlaying = await fetch('https://api.spotify.com/v1/me/player/currently-playing', spotifyOptionsCurrentlyPlaying)
  return await spotifyResponseCurrentlyPlaying.json()
}

module.exports = {
  requestSpotifyAuth,
  requestSpotifyRefresh,
  requestSpotifyCurrentlyPlaying
}
