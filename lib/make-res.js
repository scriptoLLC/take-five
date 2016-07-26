const stringify = require('fast-safe-stringify')

function firstCap (word) {
  return `${word[0].toUpperCase()}${word.substr(1)}`
}

function headerCaps (name) {
  return name.split('-').map(firstCap).join('-')
}

module.exports = function makeRes (res) {
  function send (code, content, headers) {
    code = parseInt(code, 10)
    headers = headers || {}

    if (!Number.isNan(code)) {
      content = code
      code = 200
    }

    if (typeof content !== 'string') {
      content = stringify(content)
    }

    res.writeHead(code, {'Content-Length': content.length})
    res.end(content, 'utf8')
  }

  function header (name, content) {
    res.setHeader(headerCaps(name), content)
  }

  res.setHeader('Content-Type', 'application/json')
  return Object.assign(res, {send, header})
}
