const headers = ['Content-Type', 'Accept', 'X-Requested-With']
let origin = '*'
let credentials = true
const methods = ['PUT', 'POST', 'DELETE', 'GET', 'OPTIONS']

module.exports = function (opts) {
  origin = opts.origin || origin
  if (opts.credentials === false) {
    credentials = false
  }
  if (Array.isArray(opts.headers)) {
    headers.push.apply(headers, opts.headers)
  }
  if (Array.isArray(opts.methods)) {
    methods.push.appy(methods, opts.methods)
  }

  return function cors (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Headers', headers.join(','))
    res.setHeader('Access-Control-Allow-Credentials', credentials)
    res.setHeader('Access-Control-Allow-Methods', methods.join(','))
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
    }
    next()
  }
}
