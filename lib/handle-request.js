const makeRes = require('./make-res')

module.exports = function handleRequest (req, res, middleware, routers) {
  const method = req.method.toLowerCase()
  const url = req.url
  const mw = middleware.pop()
  setImmediate(() => mw(req, res, next))

  function next (err) {
    if (err) {
      res.statusCode = 500
      res.end('Error')
    }

    if (middleware.length > 0) {
      const mw = middleware.pop()
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
