const fs = require('fs')
const moment = require('moment')
const { COUNTER } = require('../vars')
const unbreak = require('../helpers/unbreak')

module.exports = ({ startTime }) => {
  return (req, res) => {
    res.header('Access-Control-Allow-Origin', '*')

    const charity = "Donations to this channel will be sent off to the San Francisco-Marin Food Bank. You can also donate directly to them through the link at the bottom of the channel notes."

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
      alltime: `[!chrissucks Leaders (All-Time)] ${chrissucks.alltime.map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.count})`)).join(', ')}`,
      month: `[!chrissucks Leaders (Month)] ${chrissucks.month.map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.count})`)).join(', ') || '1. No one' }`,
      week: `[!chrissucks Leaders (Week)] ${chrissucks.week.map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.count})`)).join(', ') || '1. No one' }`,
    }

    const currTime = moment()
    const duration = moment.duration(currTime.diff(startTime))
    let uptime = `${duration.get('minutes')}m ${duration.get('seconds')}s`
    const hours = Math.floor(duration.as('hours'))
    if (hours) {
      uptime = `${hours}h ${uptime}`
    }

    const data = {
      charity,
      chrissucks,
      uptime,
      output_charity: `[Charity] ${charity}`,
      output_chrissucks,
      output_uptime: `[Uptime] Stream up for ${uptime}`
    }
    return res.send(data)
  }
}
