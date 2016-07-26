const makeRes = require('./make-res')

module.exports = function handleRequest (req, res, middleware, routers) {
  const method = req.method.toLowerCase()
  const url = req.url
  res = makeRes(res)
  let _count = 0
  let _len = middleware.length
  const mw = middleware[_count]
  setImmediate(() => mw(req, res, next))

  function next (err) {
    ++_count
    if (err) {
      return res.err(500)
    }

    if (_count < _len) {
      const mw = middleware[_count]
      return setImmediate(() => mw(req, res, next))
    }

    try {
      const router = routers.get(method)
      router(url, req, res)
    } catch (err) {
      return res.err(404)
    }
  }
}
