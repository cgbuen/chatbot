const bitPrefixes = ['xyz', 'abc']
const bitRegExp = new RegExp(`((${bitPrefixes.join('|')})(\\d+))`, 'g')

module.exports = bitRegExp
