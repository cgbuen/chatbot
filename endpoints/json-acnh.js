const fs = require('fs')
const requestAcnh = require('../helpers/request-acnh')
const { TOKEN_STORE } = require('../vars')
const unbreak = require('../helpers/unbreak')

module.exports = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const accessToken = (fs.readFileSync(`./${TOKEN_STORE}/acnh-access`, 'utf8') || '').trim()
  const islandId = (fs.readFileSync(`./${TOKEN_STORE}/acnh-data-land`, 'utf8') || '').trim()
  const acnhResponse = await requestAcnh.getInfo({ accessToken, islandId })
  const calendar = ['stub', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  let acnhRecords
  try {
    const { userRecordsResponse, islandRecordsResponse } = acnhResponse
    acnhRecords = {
      player: {
        name: userRecordsResponse.mPNm,
        title: userRecordsResponse.mHandleName,
        comment: userRecordsResponse.mComment,
        image: userRecordsResponse.mJpeg,
        birthday: userRecordsResponse.mBirth
      },
      neighbors: islandRecordsResponse.mNormalNpc, // array
      island: {
        name: islandRecordsResponse.mVNm,
        fruit: islandRecordsResponse.mFruit.name,
        foundedDate: userRecordsResponse.mTimeStamp, // object
      }
    }
    acnhRecords.output_player = `[Resident Representative] ${
      [
        acnhRecords.player.name,
        `Title: \u201C${acnhRecords.player.title}\u201D`,
        `Motto: \u201C${acnhRecords.player.comment}\u201D`,
      ].map(unbreak).join(', ')
    }`
    acnhRecords.output_neighbors = `[Neighbors] ${acnhRecords.neighbors.map((x, i) => `${`scgbimage_${x.image}|srcClassSep|acnhneighbor_${i}_ecgbimage`}${unbreak(`${x.name} (birthday: ${calendar[x.birthMonth]} ${x.birthDay})`)}`).join(', ')}`
    acnhRecords.output_island = `[Island] ${
      [
        acnhRecords.island.name,
        `Founded ${acnhRecords.island.foundedDate.year}-${acnhRecords.island.foundedDate.month < 10 ? '0' : ''}${acnhRecords.island.foundedDate.month}-${acnhRecords.island.foundedDate.day}`,
        `Fruit: ${acnhRecords.island.fruit}`,
      ].map(unbreak).join(', ')
    }`
  } catch (e) {
    console.log('** Error retrieving ACNH stats', e)
    acnhRecords = {}
  }
  return res.send(acnhRecords)
}
