module.exports = function unbreak(x) {
  return x
    .replace(/\s+/g, '\u00A0')
    .replace(/-/g, '\u2011')
}
