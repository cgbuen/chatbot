const fs = require('fs')
const qs = require('qs')
const Csrf = require('csrf')
const requestTwitch = require('../helpers/request-twitch')
const { TWITCH_CLIENT_ID, TOKEN_STORE } = require('../vars')

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
      'bits:read',
      'channel:moderate',
      'channel:read:redemptions',
      'channel:read:subscriptions',
      'channel_editor',
      'channel_subscriptions',
      'chat:edit',
      'chat:read',
      'moderation:read',
      'user:edit:broadcast',
      'whispers:edit',
      'whispers:read',
    ].join('__PLUS__')
  }
  const url = `https://id.twitch.tv/oauth2/authorize?${qs.stringify(query)}`.replace(/__PLUS__/g, '+')
  return res.redirect(url)
}

const callback = async (req, res) => {
  if (!csrfGenerator.verify(CSRF_SECRET, req.query.state)) {
    return res.send('Authentication failed.')
  }
  console.log('--> Requesting Twitch auth.')
  await requestTwitch.auth(req.query.code)
  return res.send(`
    <html>
      <body>
        Stored Twitch tokens. <a href="/chat">Kick off chatbot and go to dashboard</a>
      </body>
    </html>
  `)
}

module.exports = {
  init,
  callback
}
