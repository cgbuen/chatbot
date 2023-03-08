const fs = require('fs')
const moment = require('moment')
const { COUNTER } = require('../vars')
const unbreak = require('../helpers/unbreak')

module.exports = (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')

  let build
  let giveaway
  try {
    const { BUILD, GIVEAWAY } = JSON.parse(fs.readFileSync(`./command-content.json`))
    build = BUILD
    giveaway = GIVEAWAY
  } catch (e) {
    console.log('==> Could not parse command-content')
    build = 'n/a'
    giveaway = 'n/a'
  }
  let dict
  try {
    dict = JSON.parse(fs.readFileSync(`./${COUNTER}.json`))
  } catch (e) {
    console.log('** error parsing counter (probably) in internal-stats json endpoint. continuing with empty dict {}.', e)
    dict = {}
  }
  const alltime = []
  const month = []
  const week = []

  const filterThisMonth = x => x > moment().startOf('month').valueOf()
  const filterThisWeek = x => x > moment().startOf('week').valueOf()
  const sortByCount = (x, y) => y.count - x.count

  for (let key in dict) {
    if (dict.hasOwnProperty(key)) {
      const alltimeArray = dict[key].chrissucks || []
      const monthArray = (dict[key].chrissucks || []).filter(filterThisMonth)
      const weekArray = (dict[key].chrissucks || []).filter(filterThisWeek)
      alltimeArray.length && alltime.push({ name: key, count: alltimeArray.length })
      monthArray.length && month.push({ name: key, count: monthArray.length })
      weekArray.length && week.push({ name: key, count: weekArray.length })
    }
  }

  const chrissucks = {
    alltime: alltime.sort(sortByCount).slice(0, 5),
    month: month.sort(sortByCount).slice(0, 5),
    week: week.sort(sortByCount).slice(0, 5)
  }

  const output_chrissucks = {
    alltime: `[All-Time] ${chrissucks.alltime.map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.count})`)).join(', ')}`,
    month: `[Month] ${chrissucks.month.map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.count})`)).join(', ') || '1. No one' }`,
    week: `[Week] ${chrissucks.week.map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.count})`)).join(', ') || '1. No one' }`,
  }

  const data = {
    build,
    '!chrissucks': chrissucks,
    output_build: `${build}`,
    output_giveaway: `${giveaway}`,
    'output_!chrissucks': output_chrissucks,
  }
  return res.send(data)
}
