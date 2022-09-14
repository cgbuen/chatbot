const fs = require('fs')

module.exports = async function() {
  let lines = []
  const dirname = './twitch-logs/'

  fs.readdir(dirname, async function(err, filenames) {
    if (err) {
      console.log(err);
      return;
    }
    filenames.forEach(function(filename) {
      lines = [
        ...lines,
        ...fs.readFileSync(dirname + filename, 'utf-8').toString().split("\n")
      ]
    });
    // await Promise
    //   .all(filenames.map(x => {
    //     return fs.promises.readFile(dirname + x, 'utf-8')
    //   }))
    //   .then(res => {
    //     res.map(x => {
    //       lines = [
    //         ...lines,
    //         ...x.toString().split("\n")
    //       ]
    //     })
    //   })
    const dict = {}
    for (let i = 0; i < lines.length; i++) {
      const log = lines[i]
      const matcher = log.match(/\[.*?\] <(.*?)> (.*)/)
      try {
        const name = matcher[1]
        const msg = matcher[2]
        if (!/^\!((c|k)h?ri(s|d|z)?_?s?u(c|k|x)|rekt)/.test(msg)) {
          if (dict[name]) {
            dict[name]++
          } else {
            dict[name] = 1
          }
        }
      } catch (e) {
      }
    }
    let arr = []
    for (let key in dict) {
      arr.push([key, dict[key]])
    }
    arr = arr.sort((x, y) => y[1] - x[1])
    console.log(arr)
  });
}
