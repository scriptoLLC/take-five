module.exports = function restrictPost (req, res, next) {
  console.log(req.headers)
  const type = req.headers['content-type']
  if (req.method === 'POST' && type !== 'application/json') {
    res.statusCode = 415
    return res.end(`POST requests must be application/json not ${type}`)
  }
  next()
}
