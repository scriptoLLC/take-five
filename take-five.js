const assert = require('assert')
const http = require('http')
const querystring = require('querystring')

const wayfarer = require('wayfarer')

const makeRes = require('./lib/make-res')
const methods = ['get', 'put', 'post', 'delete']

module.exports = function () {
  const routers = new Map()
  const middleware = []
  const server = http.createServer()
  methods.forEach(m => {
    server[m] = (matcher, func) => addRoute(m, matcher, func)
  })

  server.use = (func) => {
    assert.ok(typeof func === 'function', 'arg was not a function')
    middleware.push(func)
  }

  server.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'X-Showunner-Auth, Content-Type, Accept, X-Requested-With')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
    }
    next()
  })

  server.use((req, res, next) => {
    const type = req.headers['Content-Type']
    if (req.method === 'POST') {
      if (type !== 'application/json') {
        res.statusCode = 415
        return res.end('POST requests must be application/json')
      }
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
    }
  })

  server.on('request', (req, res) => {
    const method = req.method
    const url = req.url
    const mws = middleware.slice(0)
    mws.pop()(req, res, done)

    function done (err) {
      if (err) {
        res.statusCode = 500
        res.end('Error')
      }

      if (mws.length > 0) {
        return mws.pop()(req, res, done)
      }

      try {
        routers[method](url, req, makeRes(res))
      } catch (err) {
        res.statusCode = 404
        res.end('Not found')
      }
    }
  })

  return server

  function addRoute (method, matcher, func) {
    if (!routers.has(method)) {
      routers.set(method, wayfarer())
    }
    routers.get(method).on(matcher, (params, req, res, next) => {
      req.params = querystring.parse(req.url.split('?')[1])
      req.urlParams = params
      func(req, res, next)
    })
  }
}
