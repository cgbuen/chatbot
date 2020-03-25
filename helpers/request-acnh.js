const fetch = require('node-fetch')
const { TOKEN_STORE } = require('../vars')

const getInfo = async ({ accessToken, islandId }) => {
  const requestOptions = {
    headers: {
      authorization: `Bearer ${accessToken}`,
    }
  }
  let userRecordsResponse
  let islandRecordsResponse
  try {
    console.log('--> Fetching Island records')
    const rawIslandRecordsResponse = await fetch(`${'https://web.sd.lp1.acbaa.srv.nintendo.net'}/api/sd/v1/lands/${islandId}/profile?language=en-US`, requestOptions)
    islandRecordsResponse = await rawIslandRecordsResponse.json()
    const { userId } = islandRecordsResponse.mVillager[0]
    console.log('--> Fetching User records')
    const rawUserRecordsResponse = await fetch(`${'https://web.sd.lp1.acbaa.srv.nintendo.net'}/api/sd/v1/users/${userId}/profile?language=en-US`, requestOptions)
    userRecordsResponse = await rawUserRecordsResponse.json()
  } catch (e) {
    console.log('==> Request fetch ACNH data error', e)
  }
  return {
    userRecordsResponse,
    islandRecordsResponse
  }
}

const postKeyboard = async (accessToken, data) => {
  const requestOptions = {
    method: 'post',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      type: 'keyboard',
      body: data.substring(0, 32)
    })
  }

  try {
    console.log('--> POSTing user channel points message to ACNH')
    const rawKeyboardPostResponse = await fetch('https://web.sd.lp1.acbaa.srv.nintendo.net/api/sd/v1/messages', requestOptions)
    const keyboardPostResponse = await rawKeyboardPostResponse.json()
    console.log('--> ACNH keyboard POST response:', keyboardPostResponse)
  } catch (e) {
    console.log('==> ACNH keyboard POST error', e)
  }

  return
}

module.exports = {
  getInfo,
  postKeyboard
}
