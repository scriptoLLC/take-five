module.exports = function handleRequest (req, res, routeList, routers) {
  let _count = 0
  let _len = routeList.length
  const mw = routeList[_count]
  setImmediate(() => mw(req, res, next))

  function next (err) {
    ++_count
    if (err) {
      return res.err(500)
    }

    if (_count < _len) {
      const mw = routeList[_count]
      return setImmediate(() => mw(req, res, next))
    } else if (routers) {
      try {
        const method = req.method.toLowerCase()
        const url = req.url.split('?')[0]
        const router = routers.get(method)
        router(url, req, res, next)
      } catch (err) {
        return res.err(404)
      }
    } else {
      if (!res.finished) {
        res.end()
      }
    }
  }
}
