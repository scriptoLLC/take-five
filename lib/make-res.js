const http = require('http')

const stringify = require('fast-safe-stringify')

module.exports = function makeRes (res) {
  function send (code, content) {
    if (typeof content === 'undefined') {
      content = code
      code = 200
    }

    if (typeof content !== 'string') {
      content = stringify(content)
    }

    res.statusCode = code
    res.end(content, 'utf8')
  }

  function err (code, content) {
    if (typeof content === 'undefined') {
      if (parseInt(code, 10)) {
        content = http.STATUS_CODES[code]
      } else {
        content = code
        code = 500
      }
    }

    res.statusCode = code
    res.statusMessage = content
    res.end(stringify({message: content}))
  }

  res.setHeader('content-type', 'application/json')
  return Object.assign(res, {send, err})
}
