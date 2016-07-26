const makeRes = require('./make-res')

module.exports = function handleRequest (req, res, middleware, routers) {
  const method = req.method.toLowerCase()
  const url = req.url
  let _count = 0
  let _len = middleware.length
  const mw = middleware[_count]
  setImmediate(() => mw(req, res, next))

  function next (err) {
    ++_count
    if (err) {
      res.statusCode = 500
      res.end('Error')
    }

    if (_count < _len) {
      const mw = middleware[_count]
      return setImmediate(() => mw(req, res, next))
    }

    try {
      const router = routers.get(method)
      router(url, req, makeRes(res))
    } catch (err) {
      console.log(err)
      res.statusCode = 404
      res.end('Not found')
    }
  }
}
