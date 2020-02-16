const fs = require('fs')
const qs = require('qs')
const Csrf = require('csrf')
const requestSpotify = require('../helpers/request-spotify')
const { SPOTIFY_CLIENT_ID } = require('../vars')

const csrfGenerator = new Csrf()
const CSRF_SECRET = csrfGenerator.secretSync()
const CSRF_TOKEN = csrfGenerator.create(CSRF_SECRET)

const init = async (req, res) => {
  const query = {
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: 'http://localhost:3000/callback-spotify',
    state: CSRF_TOKEN,
    scope: 'user-read-playback-state',
  }
  const url = `https://accounts.spotify.com/authorize?${qs.stringify(query)}`
  return res.redirect(url)
}

const callback = async (req, res) => {
  if (!csrfGenerator.verify(CSRF_SECRET, req.query.state)) {
    return res.send('Authentication failed.')
  }
  const tokenData = await requestSpotify.auth(req.query.code)
  fs.writeFileSync('./token-store/spotify-access', tokenData.access_token)
  fs.writeFileSync('./token-store/spotify-refresh', tokenData.refresh_token)
  return res.send('Stored Spotify tokens.')
}

module.exports = {
  init,
  callback
}
