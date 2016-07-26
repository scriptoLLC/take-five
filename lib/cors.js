module.exports = function cors (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'X-Showunner-Auth, Content-Type, Accept, X-Requested-With')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }
  next()
}
