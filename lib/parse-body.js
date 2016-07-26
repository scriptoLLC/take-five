const Buffer = require('buffer').Buffer

module.exports = function (maxSize) {
  return function parseBody (req, res, next) {
    if (req.method === 'POST' && !req.body) {
      const body = []
      req.on('data', (chunk) => {
        if (chunk.length > maxSize || Buffer.byteLength(body.join(''), 'utf8') > maxSize) {
          res.statusCode = 413
          return res.end(`Max payload size is ${maxSize}`)
        }

        body.push(chunk.toString('utf8'))
      })

      req.on('end', () => {
        try {
          req.body = JSON.parse(body.join(''))
        } catch (err) {
          res.statusCode = 400
          return res.send('Payload is not valid JSON')
        }
        next()
      })
      return
    }
    next()
  }
}
