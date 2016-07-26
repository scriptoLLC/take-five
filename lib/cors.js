const headers = ['Content-Type', 'Accept', 'X-Requested-With']
let origin = '*'
let credentials = true

module.exports = function (opts) {
  origin = opts.origin || origin
  credentials = !!opts.credentials || credentials
  if (Array.isArray(opts.headers)) {
    headers.push.apply(headers, opts.headers)
  }

  return function cors (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Headers', headers.join(','))
    res.setHeader('Access-Control-Allow-Credentials', credentials)
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
    }
    next()
  }
}
