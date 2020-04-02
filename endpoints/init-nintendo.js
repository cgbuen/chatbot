const fs = require('fs')
const requestSplatoon = require('../helpers/request-splatoon')
const requestAcnh = require('../helpers/request-acnh')
const { TOKEN_STORE, NINTENDO_SESSION } = require('../vars')

module.exports = async (req, res) => {
  await requestSplatoon.auth(NINTENDO_SESSION)
  console.log('--> Waiting 60s for s2s / flapg to re-allow usage due to rate limiting.')
  await (new Promise(resolve => setTimeout(resolve, 60*1000)))
  await requestAcnh.auth(NINTENDO_SESSION)
  return res.send('Stored Nintendo tokens.')
}
