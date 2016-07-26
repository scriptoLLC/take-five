module.exports = function (opts) {
  return function cors (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
    }
    next()
  }
}
