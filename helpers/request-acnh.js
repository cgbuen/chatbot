const fetch = require('node-fetch')

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
    console.log('--> Error posting', e)
  }
}

module.exports = {
  postKeyboard
}
