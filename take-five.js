const http = require('http')
const querystring = require('querystring')

const wayfarer = require('wayfarer')

const handleRequest = require('./lib/handle-request')
const cors = require('./lib/cors')
const parseBody = require('./lib/parse-body')
const restrictPost = require('./lib/restrict-post')
const methods = ['get', 'put', 'post', 'delete']

module.exports = function () {
  const routers = new Map()
  const middleware = []
  const server = http.createServer()
  methods.forEach(m => {
    server[m] = (matcher, func) => addRoute(m, matcher, func)
  })

  server.use = (funcs) => {
    if (!Array.isArray(funcs)) {
      funcs = [funcs]
    }
    middleware.push.apply(middleware, funcs)
  }

  server.use(cors)
  server.use(restrictPost)
  server.use(parseBody)
  server.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, req.body)
    next()
  })
  server.on('request', (req, res) => handleRequest(req, res, middleware.slice(0), routers))

  return server

  function addRoute (method, matcher, func) {
    if (!routers.has(method)) {
      routers.set(method, wayfarer())
    }
    routers.get(method).on(matcher, (params, req, res) => {
      req.params = querystring.parse(req.url.split('?')[1])
      req.urlParams = params
      func(req, res)
    })
  }
}
