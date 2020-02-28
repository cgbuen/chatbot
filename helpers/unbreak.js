module.exports = function unbreak(x) {
  // replace spaces and hyphens with non-breaking versions
  return (x || '')
    .trim()
    .replace(/\s+/g, '\u00A0')
    .replace(/-/g, '\u2011')
}
