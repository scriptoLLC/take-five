module.exports = function restrictPost (req, res, next) {
  const type = req.headers['Content-Type']
  if (req.method === 'POST' && type !== 'application/json') {
    res.statusCode = 415
    return res.end(`POST requests must be application/json not ${type}`)
  }
  next()
}
