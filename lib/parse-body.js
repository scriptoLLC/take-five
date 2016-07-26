module.exports = function parseBody (req, res, next) {
  if (req.method === 'POST' && !req.body) {
    const body = []
    req.on('data', (chunk) => body.push(chunk.toString('utf8')))
    req.on('end', () => {
      try {
        req.body = JSON.parse(body.join(''))
      } catch (err) {
        res.statusCode = 500
        return res.send('Cannot parse payload')
      }
      next()
    })
    return
  }
  next()
}
