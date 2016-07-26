module.exports = function (maxSize) {
  return function restrictPost (req, res, next) {
    if (req.method === 'POST') {
      const type = req.headers['content-type']
      const size = req.headers['content-length']
      if (type !== 'application/json') {
        res.statusCode = 415
        return res.end(`POST requests must be application/json not ${type}`)
      }

      if (size > maxSize) {
        res.statusCode = 413
        return res.end(`Maximum size for requests is ${maxSize}`)
      }
    }
    next()
  }
}
