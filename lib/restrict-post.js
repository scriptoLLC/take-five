module.exports = function (maxSize) {
  return function restrictPost (req, res, next) {
    if (req.method === 'POST') {
      const type = req.headers['content-type']
      const size = req.headers['content-length']
      if (type !== 'application/json') {
        return res.err(415, `POST requests must be application/json not ${type}`)
      }

      if (size > maxSize) {
        return res.err(413, `Maximum size for requests is ${maxSize}`)
      }
    }
    next()
  }
}
