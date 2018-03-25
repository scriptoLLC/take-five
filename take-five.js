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
const HEADERS = ['Content-Type', 'Accept', 'X-Requested-With']

class TakeFive {
  constructor (opts) {
    opts = opts || {}
    this.maxPost = opts.maxPost || MAX_POST
    this.allowOrigin = opts.allowOrigin || ORIGIN
    this.allowCredentials = opts.allowCredentials || CREDENTIALS
    this.allowMethods = opts.allowMethods || methods
    this.allowHeaders = opts.allowHeaders || HEADERS
    this._httpLib = http
    this._httpOpts = opts.http || {}

    if (this._httpOpts.key && this._httpOpts.cert && this._httpOpts.ca) {
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

  parseBody (req, res, ctx) {
    try {
      ctx.body = JSON.parse(ctx.body)
      this._handleRequest(req, res, ctx)
    } catch (err) {
      return ctx.err(400, 'Payload is not valid JSON')
    }
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

    return Object.assign({}, {send, err})
  }

  cors (res) {
    res.setHeader('Access-Control-Allow-Origin', this.allowOrigin)
    res.setHeader('Access-Control-Allow-Headers', this.allowHeaders.join(',').toUpperCase())
    res.setHeader('Access-Control-Allow-Credentials', this.allowCredentials)
    res.setHeader('Access-Control-Allow-Methods', this.allowMethods.join(',').toUpperCase())
  }

  listen (port, func) {
    this.server.listen(port, func)
  }

  close () {
    this.server.close()
  }

  _handleRequest (req, res, ctx) {
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

  _verifyBody (req, res, ctx) {
    const type = req.headers['content-type']
    const size = req.headers['content-length']

    if (type !== 'application/json') {
      return ctx.err(415, `POST requests must be application/json not ${type}`)
    }

    if (size > this.maxPost) {
      return ctx.err(413, `${size} exceeds maximum size for requests`)
    }

    const parser = concat((data) => {
      if (!res.finished) {
        ctx.body = data
        this.parseBody(req, res, ctx)
      }
    })
    req.pipe(parser)

    const body = []
    req.on('data', (chunk) => {
      if (chunk.length > this.maxPost || Buffer.byteLength(body.join(''), 'utf8') > this.maxPost) {
        return ctx.err(413, 'Payload size exceeds maxmium body length')
      }
    })
  }

  _onRequest (req, res) {
    this.cors(res)

    if (req.method === 'OPTIONS') {
      res.statusCode = 203
      return res.end()
    }

    const ctx = this.makeCtx(res)
    const conlen = parseInt(req.headers['content-length'], 10) || 0

    if (conlen !== 0 && dataMethods.includes(req.method.toLowerCase())) {
      this._verifyBody(req, res, ctx)
    } else {
      this._handleRequest(req, res, ctx)
    }
  }

  _addRouters () {
    this.methods.forEach((method) => {
      Object.defineProperty(this, method, {
        value: (matcher, handler) => {
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
            ctx.params = querystring.parse(req.url.split('?')[1])
            ctx.urlParams = params
            handlers.forEach((handler) => {
              if (!res.finished) handler(req, res, ctx)
            })
          })
        }
      })
    })
  }
}

module.exports = TakeFive
