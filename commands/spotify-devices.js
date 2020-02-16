const fs = require('fs')
const requestSpotify = require('../helpers/request-spotify')
const { TOKEN_STORE } = require('../vars')

module.exports = async function devices() {
  const accessToken = fs.readFileSync(`./${TOKEN_STORE}/spotify-access`)
  const spotifyDeviceData = await requestSpotify.devices(accessToken)
  const msg = spotifyDeviceData.devices.map(device => `${device.name} (${device.type})`).join(', ') || 'no devices'
  return msg
}
