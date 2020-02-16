module.exports = (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  return res.send(fs.readFileSync(`${counterDir}/${COUNTER}.json`))
}
