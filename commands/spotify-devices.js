const requestSpotify = require('../request-spotify')

module.exports = async function devices({ chat, spotifyTokenData }) {
  let accessToken = spotifyTokenData.access_token
  let refreshToken = spotifyTokenData.refresh_token
  const spotifyDeviceData = await requestSpotify.devices(accessToken)
  const msg = spotifyDeviceData.devices.map(device => `${device.name} (${device.type})`).join(', ') || 'no devices'
  return msg
}
