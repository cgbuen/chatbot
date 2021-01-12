const fs = require('fs')

module.exports = function build() {
  return fs.readFileSync(`./build-command`)
}
