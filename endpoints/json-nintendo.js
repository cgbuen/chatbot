module.exports = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const requestNintendo = require('./request-nintendo')
  return res.send(await requestNintendo.requestPlayer())
}
