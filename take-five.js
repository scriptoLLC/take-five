const http = require('http')
const https = require('https')
const querystring = require('querystring')
const Buffer = require('buffer').Buffer

const stringify = require('fast-safe-stringify')
const wayfarer = require('wayfarer')
const concat = require('concat-stream')

const methods = ['get', 'put', 'post', 'delete', 'patch']
const dataMethods = ['put', 'post', 'patch']

const MAX_POST = 512 * 1024
const ORIGIN = '*'
const CREDENTIALS = true
const ALLOWED_TYPES = ['application/json']
const HEADERS = ['Content-Type', 'Accept', 'X-Requested-With']

class TakeFive {
  constructor (opts) {
    this._allowMethods = ['options'].concat(methods)
    this._allowHeaders = HEADERS.slice(0)
    this._allowContentTypes = ALLOWED_TYPES.slice(0)
    this._parsers = {
      'application/json': JSON.parse
    }

    opts = opts || {}
    this.maxPost = opts.maxPost || MAX_POST
    this.allowedContentTypes = opts.allowContentTypes
    this.allowOrigin = opts.allowOrigin || ORIGIN
    this.allowCredentials = CREDENTIALS
    if (typeof opts.allowCredentials === 'boolean') {
      this.allowCredentials = opts.allowCredentials
    }

    if (opts.allowHeaders) {
      this.allowHeaders = opts.allowHeaders
    }

    if (opts.allowMethods) {
      this.allowMethods = opts.allowMethods
    }

    this._httpLib = http
    this._httpOpts = opts.http || {}
    this._ctx = {}

    if (this._httpOpts.key && this._httpOpts.cert) {
      this._httpLib = https
    }

    this.routers = new Map()
    const args = []
    if (Object.keys(this._httpOpts).length > 0) {
      args.push(this._httpOpts)
    }
    args.push(this._onRequest.bind(this))
    this.server = this._httpLib.createServer.apply(this._httpLib, args)
    this.methods = methods.concat(opts.methods || [])
    this._addRouters()
  }

  set allowContentTypes (types) {
    if (!Array.isArray(types)) {
      types = [types]
    }
    this._allowContentTypes = this._allowContentTypes.concat(types)
  }

  get allowContentTypes () {
    return this._allowContentTypes
  }

  addParser (type, func) {
    if (typeof type === 'string' && typeof func === 'function') {
      this._parsers[type] = func
    }
  }

  set allowHeaders (headers) {
    headers = Array.isArray(headers) ? headers : [headers]
    this._allowHeaders = this._allowHeaders.concat(headers)
  }

  get allowHeaders () {
    return this._allowHeaders
  }

  set allowMethods (methods) {
    methods = Array.isArray(methods) ? methods : [methods]
    this._allowMethods = this._allowMethods.concat(methods)
  }

  get allowMethods () {
    return this._allowMethods
  }

  set ctx (ctx) {
    const ctxType = Object.prototype.toString.call(ctx)
    if (ctxType !== '[object Object]') {
      throw new Error(`ctx must be an object, was ${ctxType}`)
    }
    this._ctx = Object.assign({}, ctx)
  }

  get ctx () {
    return this._ctx
  }

  parseBody (data, type) {
    const parser = this._parsers[type]
    if (typeof parser === 'function') {
      return parser(data)
    }
    return data
  }

  makeCtx (res) {
    function send (code, content) {
      if (typeof content === 'undefined') {
        content = code
        code = 200
      }

      if (typeof content !== 'string') {
        content = stringify(content)
      }

      res.statusCode = code
      res.setHeader('content-type', 'application/json')
      res.end(content, 'utf8')
    }

    function err (code, content) {
      if (typeof content === 'undefined') {
        if (parseInt(code, 10)) {
          content = http.STATUS_CODES[code]
        } else {
          content = code
          code = 500
        }
      }

      res.statusCode = code
      res.statusMessage = content
      res.setHeader('content-type', 'application/json')
      res.end(stringify({message: content}))
    }

    return Object.assign({}, this.ctx, {send, err})
  }

  handleError (err, req, res, ctx) { // eslint-disable-line
  }

  cors (res) {
    res.setHeader('Access-Control-Allow-Origin', this.allowOrigin)
    res.setHeader('Access-Control-Allow-Headers', this.allowHeaders.join(','))
    res.setHeader('Access-Control-Allow-Credentials', this.allowCredentials)
    res.setHeader('Access-Control-Allow-Methods', this.allowMethods.join(',').toUpperCase())
  }

  listen (port, func) {
    this.server.listen(port, func)
  }

  close () {
    this.server.close()
  }

  _verifyBody (req, res, ctx) {
    return new Promise((resolve) => {
      const type = req.headers['content-type']
      const size = req.headers['content-length']
      const _ctxMax = parseInt(ctx.maxPost, 10)
      const maxPost = Number.isNaN(_ctxMax) ? this.maxPost : _ctxMax

      let allowContentTypes = this.allowContentTypes.slice(0)
      if (ctx.allowContentTypes) {
        allowContentTypes = allowContentTypes.concat(ctx.allowContentTypes)
      }

      if (size > maxPost) {
        return ctx.err(413, `Payload size exceeds maximum size for requests`)
      }

      if (!allowContentTypes.includes(type)) {
        return ctx.err(415, `Expected data to be of ${allowContentTypes.join(', ')} not ${type}`)
      } else {
        const parser = concat((data) => {
          try {
            ctx.body = this.parseBody(data.toString('utf8'), type)
          } catch (err) {
            return ctx.err(400, `Payload is not valid ${type}`)
          }
          resolve()
        })

        req.pipe(parser)

        const body = []
        req.on('data', (chunk) => {
          body.push(chunk.toString('utf8'))
          if (chunk.length > this.maxPost || Buffer.byteLength(body.join(''), 'utf8') > this.maxPost) {
            req.pause()
            return ctx.err(413, 'Payload size exceeds maximum body length')
          }
        })
      }
    })
  }

  _onRequest (req, res) {
    this.cors(res)

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
    }

    const ctx = this.makeCtx(res)

    try {
      const method = req.method.toLowerCase()
      const url = req.url.split('?')[0]
      const router = this.routers.get(method)
      router(url, req, res, ctx)
    } catch (err) {
      if (res.finished) {
        throw err
      }
      return ctx.err(404, 'Not found')
    }
  }

  _addRouters () {
    this.methods.forEach((method) => {
      Object.defineProperty(this, method, {value: generateRouter(method)})
    })

    function generateRouter (method) {
      return function (matcher, handler, ctxOpts) {
        let router = this.routers.get(method)
        if (!router) {
          router = wayfarer('/_')
          this.routers.set(method, router)
        }

        const handlers = Array.isArray(handler) ? handler : [handler]

        if (handlers.some((f) => typeof f !== 'function')) {
          throw new Error('handlers must be functions')
        }

        router.on(matcher, (params, req, res, ctx) => {
          const routeHandlers = handlers.slice(0)

          const conlen = parseInt(req.headers['content-length'], 10) || 0
          if (conlen !== 0 && dataMethods.includes(req.method.toLowerCase())) {
            if (ctxOpts) ctx = Object.assign({}, ctx, ctxOpts)
            routeHandlers.unshift(this._verifyBody.bind(this))
          }

          ctx.query = querystring.parse(req.url.split('?')[1])
          ctx.params = params
          this._resolveHandlers(req, res, ctx, routeHandlers)
        })
      }
    }
  }

  _resolveHandlers (req, res, ctx, handlers) {
    const next = handlers.shift()
    iterate(next)

    function iterate (handler) {
      const p = handler(req, res, ctx)
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (!res.finished && handlers.length > 0) {
            const next = handlers.shift()
            iterate(next)
          }
        })
          .catch((err) => {
            this.handleError(err, req, res, ctx)
          })
      }
    }
  }
}

module.exports = TakeFive
