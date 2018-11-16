const stream = require('stream')

const test = require('tap').test
const request = require('nanorequest')
const selfsigned = require('selfsigned')

const TF = require('../')

function toJSON (data) {
  const [key, val] = data.split('=')
  return {[key]: val}
}

test('http', (t) => {
  const takeFive = new TF()
  takeFive.server.on('error', (err) => console.log(err))
  takeFive.listen(3000)
  takeFive.addParser('application/x-www-form-urlencoded', toJSON)

  t.test('adding routes', (t) => {
    t.doesNotThrow(() => {
      takeFive.get('/', (req, res, ctx) => {
        ctx.send({hello: ['world']})
      })
      takeFive.post('/', (req, res, ctx) => ctx.send(201, ctx.body))
      takeFive.put('/:test', (req, res, ctx) => ctx.send(ctx.params))
      takeFive.delete('/:test', (req, res, ctx) => ctx.send(ctx.query))
      takeFive.get('/err', (req, res, ctx) => ctx.err('broken'))
      takeFive.get('/err2', (req, res, ctx) => ctx.err(400, 'bad'))
      takeFive.get('/err3', (req, res, ctx) => ctx.err(418))
      takeFive.post('/urlencoded', (req, res, ctx) => ctx.send(201, ctx.body), {allowContentTypes: ['application/x-www-form-urlencoded']})
      takeFive.post('/zero', (req, res, ctx) => {}, {maxPost: 0})
      takeFive.get('/next', [
        (req, res, ctx) => {
          return new Promise((resolve) => {
            res.statusCode = 202
            res.setHeader('content-type', 'application/json')
            resolve()
          })
        },
        (req, res, ctx) => {
          res.end('{"message": "complete"}')
        }
      ])
      takeFive.get('/end', [
        (req, res, ctx) => {
          return new Promise((resolve) => {
            res.statusCode = 418
            res.end()
            resolve()
          })
        },
        (req, res, ctx) => t.fail('should never get called')
      ])
    }, 'added routes')
    t.end()
  })

  t.test('ends response if no more paths', (t) => {
    const opts = {
      url: 'http://localhost:3000/next',
      json: true
    }

    request(opts, (err, res, body) => {
      t.error(err, 'no error')
      t.equal(res.statusCode, 202, '202')
      t.equal(body.message, 'complete', 'complete')
      t.end()
    })
  })

  t.test('does not call end twice', (t) => {
    const opts = {
      url: 'http://localhost:3000/end'
    }
    request(opts, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 418, 'teapot')
      t.end()
    })
  })

  t.test('not found', (t) => {
    const opts = {
      url: 'http://localhost:3000/bar/doo'
    }

    request(opts, (err, res, body) => {
      t.ok(err, 'errored')
      t.equal(res.statusCode, 404, 'not found')
      t.equal(body.message, 'Not found', 'not found')
      t.end()
    })
  })

  t.test('get json', (t) => {
    const opts = {
      url: 'http://localhost:3000/'
    }

    request(opts, (err, res, body) => {
      t.error(err, 'no errors')
      t.equal(res.statusCode, 200, 'got a 200')
      t.deepEqual(body, {hello: ['world']}, 'hello, world')
      t.end()
    })
  })

  t.test('500 error', (t) => {
    const opts = {
      url: 'http://localhost:3000/err'
    }

    request(opts, (err, res, body) => {
      t.ok(err, 'errored')
      t.equal(res.statusCode, 500, 'default is 500')
      t.equal(body.message, 'broken', 'it is!')
      t.end()
    })
  })

  t.test('400 error', (t) => {
    const opts = {
      url: 'http://localhost:3000/err2'
    }
    request(opts, (err, res, body) => {
      t.ok(err, 'errored')
      t.equal(res.statusCode, 400, 'bad content')
      t.equal(body.message, 'bad', 'bad dudes')
      t.end()
    })
  })

  t.test('418 error', (t) => {
    const opts = {
      url: 'http://localhost:3000/err3'
    }
    request(opts, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 418, 'teapot')
      t.ok(/teapot/i.test(body.message), 'short and stout')
      t.end()
    })
  })

  t.test('post json', (t) => {
    const opts = {
      url: 'http://localhost:3000/',
      method: 'post',
      body: {foo: 'bar'},
      headers: {
        'content-type': 'application/json'
      }
    }
    request(opts, (err, res, body) => {
      t.error(err, 'no errors')
      t.equal(res.statusCode, 201, 'got a 201')
      t.deepEqual(body, {foo: 'bar'}, 'matches')
      t.end()
    })
  })

  t.test('post not-json', (t) => {
    const opts = {
      url: 'http://localhost:3000/',
      method: 'post',
      body: 'foo=bar'
    }
    request(opts, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 415, 'content not allowed')
      t.equal(body.message, 'Expected data to be of application/json not undefined', 'no match')
      t.end()
    })
  })

  t.test('post non-json with custom parser', (t) => {
    const opts = {
      url: 'http://localhost:3000/urlencoded',
      method: 'post',
      body: 'foo=bar',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }

    request(opts, (err, res, body) => {
      t.error(err, 'no error')
      t.equal(res.statusCode, 201, 'got a 201')
      t.deepEqual(body, {foo: 'bar'}, 'matches')
      t.end()
    })
  })

  t.test('post too large with header', (t) => {
    const opts = {
      method: 'post',
      url: 'http://localhost:3000/',
      body: '',
      headers: {
        'content-length': 512 * 2048,
        'content-type': 'application/json'
      }
    }
    request(opts, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 413, 'too large')
      t.equal(body.message, `Payload size exceeds maximum size for requests`, 'too large')
      t.end()
    })
  })

  t.test('post too large with header and custom size per route', (t) => {
    const opts = {
      method: 'post',
      url: 'http://localhost:3000/zero',
      body: '',
      headers: {
        'content-length': 1,
        'content-type': 'application/json'
      }
    }
    request(opts, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 413, 'too large')
      t.equal(body.message, `Payload size exceeds maximum size for requests`, 'too large')
      t.end()
    })
  })

  t.test('put no content', (t) => {
    const opts = {
      url: 'http://localhost:3000/',
      method: 'put',
      headers: {
        'content-length': 0,
        'content-type': 'application/json'
      }
    }

    request(opts, (err, res, body) => {
      t.error(err)
      t.end()
    })
  })

  t.test('put with url params', (t) => {
    const opts = {
      method: 'put',
      url: 'http://localhost:3000/foobar',
      headers: {
        'content-type': 'application/json'
      }
    }
    request(opts, (err, res, body) => {
      t.error(err, 'no error')
      t.deepEqual(body, {test: 'foobar'}, 'params passed')
      t.end()
    })
  })

  t.test('delete with query params', (t) => {
    const opts = {
      method: 'delete',
      url: 'http://localhost:3000/foobar?beep=boop'
    }
    request(opts, (err, res, body) => {
      t.error(err, 'no error')
      t.deepEqual(body, {beep: 'boop'}, 'url parsed')
      t.end()
    })
  })

  t.test('teardown', (t) => {
    takeFive.close()
    t.end()
  })

  t.end()
})

test('cors', (t) => {
  t.test('options', (t) => {
    const opts = {
      allowMethods: 'PROPFIND',
      allowHeaders: 'X-Bar'
    }
    const five = new TF(opts)
    t.deepEqual(five.allowMethods, ['options', 'get', 'put', 'post', 'delete', 'patch', 'PROPFIND'], 'methods')
    t.deepEqual(five.allowHeaders, ['Content-Type', 'Accept', 'X-Requested-With', 'X-Bar'], 'headers')
    t.end()
  })

  t.test('full run', (t) => {
    t.plan(12)
    const opts = {
      allowMethods: ['PROPFIND'],
      allowHeaders: ['X-Foo'],
      allowOrigin: 'localhost',
      allowCredentials: false
    }
    const server = new TF(opts)

    server.get('/', (req, res, ctx) => {
      ctx.send({message: true})
    })

    server.listen(3000)

    const opts1 = {
      url: 'http://localhost:3000/',
      method: 'options'
    }
    request(opts1, (err, res, body) => {
      t.error(err, 'no error')
      t.equal(res.statusCode, 204, 'no content')
      t.equal(res.headers['access-control-allow-origin'], 'localhost', 'acao')
      t.equal(res.headers['access-control-allow-credentials'], 'false', 'acac')
      t.equal(res.headers['access-control-allow-headers'], 'Content-Type,Accept,X-Requested-With,X-Foo', 'acah')
      t.equal(res.headers['access-control-allow-methods'], 'OPTIONS,GET,PUT,POST,DELETE,PATCH,PROPFIND', 'acam')
    })

    const opts2 = {
      url: 'http://localhost:3000'
    }
    request(opts2, (err, res, body) => {
      t.error(err, 'no error')
      t.equal(res.statusCode, 200, 'no content')
      t.equal(res.headers['access-control-allow-origin'], 'localhost', 'acao')
      t.equal(res.headers['access-control-allow-credentials'], 'false', 'acac')
      t.equal(res.headers['access-control-allow-headers'], 'Content-Type,Accept,X-Requested-With,X-Foo', 'acah')
      t.equal(res.headers['access-control-allow-methods'], 'OPTIONS,GET,PUT,POST,DELETE,PATCH,PROPFIND', 'acam')
      server.close()
    })
  })

  t.end()
})

test('large streams', (t) => {
  const opts = {
    maxPost: 100
  }
  const server = new TF(opts)

  class Request extends stream.Readable {
    constructor () {
      super()
      this.max = 101
      this.i = 0
    }

    _read () {
      if (this.i < this.max) {
        this.push('a')
      } else {
        this.push(null)
      }
    }
  }

  const req = new Request()
  req.headers = {
    'content-type': 'application/json',
    'content-length': 1
  }

  const ctx = {
    err (code, msg) {
      t.equal(code, 413, 'too big')
      t.equal(msg, 'Payload size exceeds maximum body length')
      t.end()
    }
  }

  server._verifyBody(req, {}, ctx)
})

test('large chunks', (t) => {
  const opts = {
    maxPost: 100
  }
  const server = new TF(opts)

  class Request extends stream.Readable {
    _read () {
      this.push('a'.repeat(200))
    }
  }

  const req = new Request()
  req.headers = {
    'content-type': 'application/json',
    'content-length': 1
  }

  const ctx = {
    err (code, msg) {
      t.equal(code, 413, 'too big')
      t.equal(msg, 'Payload size exceeds maximum body length')
      t.end()
    }
  }

  server._verifyBody(req, {}, ctx)
})

test('body parser', (t) => {
  const opts = {
    maxPost: 100
  }
  const server = new TF(opts)
  server.listen(3000)
  server.post('/', (req, res, ctx) => ctx.send(req.body))

  t.test('invalid json', (t) => {
    const opts = {
      method: 'post',
      url: 'http://localhost:3000/',
      body: 'wahoo []',
      headers: {'content-type': 'application/json'}
    }

    request(opts, (err, res, body) => {
      t.ok(err, 'got error')
      t.equal(res.statusCode, 400, 'invalid json')
      t.equal(body.message, 'Payload is not valid application/json', 'not valid')
      t.end()
    })
  })

  t.test('teardown', (t) => {
    server.close()
    t.end()
  })
  t.end()
})

test('https', (t) => {
  const certOpts = {
    days: 1,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          {
            type: 2,
            value: 'localhost'
          }
        ]
      }
    ]
  }
  const keys = selfsigned.generate([{name: 'commonName', value: 'localhost'}], certOpts)
  const opts = {
    http: {
      key: keys.private,
      cert: keys.cert
    }
  }
  const five = new TF(opts)
  t.equal(five._httpLib.globalAgent.protocol, 'https:', 'is https server')
  t.end()
})

test('changing ctx', (t) => {
  t.test('good', (t) => {
    const five = new TF()
    five.ctx = {
      foo: 'bar',
      err: false
    }

    five.get('/', (req, res, ctx) => {
      t.equal(ctx.foo, 'bar', 'has bar')
      t.ok(typeof ctx.err === 'function', 'err still function')
      t.deepEqual(Object.keys(ctx), ['foo', 'err', 'send', 'query', 'params'], 'got keys')
      ctx.send({ok: true})
    })

    five.listen(3000)

    const opts = {
      url: 'http://localhost:3000/'
    }

    request(opts, (err, res, body) => {
      t.error(err, 'no error')
      five.close()
      t.end()
    })
  })

  t.test('bar', (t) => {
    const five = new TF()
    t.throws(() => {
      five.ctx = 'beep'
    })
    t.end()
  })

  t.end()
})

test('functions only', (t) => {
  const five = new TF()
  t.throws(() => {
    five.get('/', 'bar')
  })
  t.end()
})
