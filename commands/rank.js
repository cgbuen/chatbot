const fs = require('fs')
const { COUNTER } = require('../vars')

module.exports = function rank({ username }) {
  // !rank: retrieve score data, analyze, and spit back out into message
  const dict = JSON.parse(fs.readFileSync(`./${COUNTER}.json`))
  const userCount = (dict[username] && dict[username].chrissucks) || 0
  let totalCount = 0

  // create ranks array, where indices may be undefined, e.g.
  // [undefined, 3, 3, 1, undefined, undefined, undefined, undefined, 1]
  // indices correspond to how many people have done this that many
  // times
  const countRanks = []
  for (let key in dict) {
    if (dict.hasOwnProperty(key)) {
      const count = parseInt(dict[key].chrissucks)
      if (countRanks[count]) {
        countRanks[count]++
      } else {
        countRanks[count] = 1
      }
      totalCount = totalCount + count
    }
  }

  // break out the array of people ahead of the current user. note that
  // the identity filter (x => x) removes the `undefined`s
  const usersAhead = countRanks.slice(parseInt(userCount) + 1).filter(x => x)

  // determine rank by adding 1 to the sum of values in usersAhead array
  const rank = usersAhead.reduce((acc, cv) => acc + cv, 0) + 1

  // determine the full rank message
  const isTied = countRanks[parseInt(userCount)] > 1
  const numberTiedWith = isTied && (countRanks[parseInt(userCount)] - 1)
  const tiedMsg = isTied ? ` (tied with ${numberTiedWith} other${numberTiedWith !== 1 ? 's' : ''})` : ''
  const rankMsg = userCount === 0 ? 'n/a' : `${rank}${tiedMsg}`

  const msg = `
    ${username} !chrissucks score: ${userCount}.
    rank: ${rankMsg}.
    total times i've been told i suck: ${totalCount}.
  `.replace(/\s+/gm, ' ') // allows for formatting above, but should be output with no newlines

  return msg
}
