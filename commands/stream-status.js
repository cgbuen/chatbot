const fs = require('fs')
const requestTwitch = require('../helpers/request-twitch')
const { CHANNEL, TOKEN_STORE } = require('../vars')

module.exports = async function streamStatus(username, message) {
  let msg
  let canSetChannelInfo
  let gameId
  const userInput = message.match(/^\!(game|category|title)\s+(.*?)\s*$/)[2]
  try {
    const getModsResponse = await requestTwitch.getMods(fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
    const mods = getModsResponse.data.map(x => x.userName)
    mods.push(CHANNEL)
    canSetChannelInfo = mods.includes(username)
  } catch (e) {
    console.log('==> Could not get mods list', e)
    return 'n/a'
  }
  if (!canSetChannelInfo) {
    return 'ain\'t a mod'
  }
  if (message.startsWith('!game') || message.startsWith('!category')) {
    try {
      const getGameResponse = await requestTwitch.getGame(userInput, fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
      try {
        gameId = getGameResponse.data[0].id
      } catch (e) {
        console.log('==> No game exists on twitch', e)
        return 'no game bro'
      }
    } catch (e) {
      console.log('==> Could not get game', e)
      return 'n/a'
    }
    try {
      const setGameResponse = await requestTwitch.setGame(gameId, fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
      if (setGameResponse.status === 204) {
        msg = 'coo'
      } else {
        msg = 'twitch buggin rn or somethin'
      }
    } catch (e) {
      console.log('==> Could not set game', e)
      return 'n/a'
    }
  } else {
    try {
      const setTitleResponse = await requestTwitch.setTitle(userInput, fs.readFileSync(`./${TOKEN_STORE}/twitch-access`, 'utf8').trim())
      if (setTitleResponse.status === 204) {
        msg = 'yep'
      } else {
        msg = 'twitch buggin rn or somethin'
      }
    } catch (e) {
      console.log('==> Could not set title', e)
      return 'n/a'
    }
  }
  return msg
}
