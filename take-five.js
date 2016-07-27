const path = require('path')
const http = require('http')
const querystring = require('querystring')

const wayfarer = require('wayfarer')

const handleRequest = require('./lib/handle-request')
const cors = require('./lib/cors')
const parseBody = require('./lib/parse-body')
const restrictPost = require('./lib/restrict-post')
const makeRes = require('./lib/make-res')
const methods = ['get', 'put', 'post', 'delete']

module.exports = function (opts) {
  opts = opts || {}
  opts.maxPost = opts.maxPost || 512 * 1024
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

  server.router = (ns) => {
    const router = {}
    methods.forEach(m => {
      router[m] = (matcher, func) => {
        const nsMatcher = path.join(ns, matcher)
        addRoute(m, nsMatcher, func)
      }
    })
    return router
  }

  server.use(cors(opts.cors || {}))
  server.use(restrictPost(opts.maxPost))
  server.use(parseBody(opts.maxPost))
  server.on('request', (req, res) => handleRequest(req, makeRes(res), middleware, routers))

  return server

  function addRoute (method, matcher, funcs) {
    if (!routers.has(method)) {
      routers.set(method, wayfarer('/_'))
    }

    if (!Array.isArray(funcs)) {
      funcs = [funcs]
    }

    routers.get(method).on(matcher, (params, req, res) => {
      req.params = querystring.parse(req.url.split('?')[1])
      req.urlParams = params
      handleRequest(req, res, funcs)
    })
  }
}
