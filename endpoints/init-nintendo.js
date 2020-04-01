const fs = require('fs')
const requestSplatoon = require('../helpers/request-splatoon')
const requestAcnh = require('../helpers/request-acnh')
const { TOKEN_STORE } = require('../vars')

module.exports = async (req, res) => {
  const nintendoAccess = (fs.readFileSync(`./${TOKEN_STORE}/nintendo-access`, 'utf8') || '').trim()
  await requestSplatoon.auth(nintendoAccess)
  console.log('--> Waiting 60s for s2s / flapg to re-allow usage due to rate limiting.')
  await (new Promise(resolve => setTimeout(resolve, 60*1000)))
  await requestAcnh.auth(nintendoAccess)
  return res.send('Stored Nintendo tokens.')
}
