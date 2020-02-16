const fs = require('fs')
const qs = require('qs')
const Csrf = require('csrf')
const requestTwitch = require('../helpers/request-twitch')
const { TWITCH_CLIENT_ID } = require('../vars')

const csrfGenerator = new Csrf()
const CSRF_SECRET = csrfGenerator.secretSync()
const CSRF_TOKEN = csrfGenerator.create(CSRF_SECRET)

const init = async (req, res) => {
  const query = {
    client_id: TWITCH_CLIENT_ID,
    response_type: 'code',
    redirect_uri: 'http://localhost:3000/callback-twitch',
    state: CSRF_TOKEN,
    force_verify: true,
    scope: [
      'channel:read:subscriptions',
      'bits:read',
      'chat:read',
      'chat:edit',
      'channel:moderate',
      'whispers:read',
      'whispers:edit',
      'channel_editor',
      'channel_subscriptions',
    ].join('__PLUS__')
  }
  const url = `https://id.twitch.tv/oauth2/authorize?${qs.stringify(query)}`.replace(/__PLUS__/g, '+')
  return res.redirect(url)
}

const callback = async (req, res) => {
  if (!csrfGenerator.verify(CSRF_SECRET, req.query.state)) {
    return res.send('Authentication failed.')
  }
  const tokenData = await requestTwitch.auth(req.query.code)
  fs.writeFileSync('./token-store/twitch-access', tokenData.access_token)
  fs.writeFileSync('./token-store/twitch-refresh', tokenData.refresh_token)
  return res.send('Stored Twitch tokens.')
}

module.exports = {
  init,
  callback
}
