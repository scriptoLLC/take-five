const test = require('tap').test
const request = require('nanorequest')
// const stringify = require('fast-safe-stringify')
const TF = require('../')

test('http', (t) => {
  const takeFive = new TF()
  takeFive.server.on('error', (err) => console.log(err))
  takeFive.listen(3000)

  t.test('adding routes', (t) => {
    t.doesNotThrow(() => {
      takeFive.get('/', (req, res, ctx) => ctx.send({hello: ['world']}))
      takeFive.post('/', (req, res, ctx) => ctx.send(201, ctx.body))
      takeFive.put('/:test', (req, res, ctx) => ctx.send(ctx.params))
      takeFive.delete('/:test', (req, res, ctx) => ctx.send(ctx.query))
      takeFive.get('/err', (req, res, ctx) => ctx.err('broken'))
      takeFive.get('/err2', (req, res, ctx) => ctx.err(400, 'bad'))
      takeFive.get('/err3', (req, res, ctx) => ctx.err(418))
      takeFive.get('/next', [
        (req, res, ctx) => {
          res.statusCode = 202
          res.setHeader('content-type', 'application/json')
          ctx.next('1')
        },
        (req, res, ctx) => {
          return new Promise((resolve) => {
            res.end('{"message": "complete"}')
            resolve('2')
          })
        }
      ])
      takeFive.get('/end', [
        (req, res, ctx) => {
          res.statusCode = 418
          res.end()
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
      url: 'http://localhost:3000/err3',
      method: 'post',
      body: 'foo=bar'
    }
    request(opts, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 415, 'content not allowed')
      t.equal(body.message, 'POST requests must be application/json not undefined', 'no match')
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
      t.equal(body.message, `${512 * 2048} exceeds maximum size for requests`, 'too large')
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

test('cors', {skip: true}, (t) => {
  const server = TF({cors: {
    headers: ['X-Foo'],
    origin: 'localhost',
    credentials: false
  }})
  server.listen(3000)
  server.get('/', (req, res) => {
    res.writeHead(200)
    res.send({message: true})
  })

  t.test('preflight', (t) => {
    request('options', '/', null, null, (err, res, body) => {
      t.error(err, 'no error')
      t.equal(res.statusCode, 204, 'no content')
      t.equal(res.headers['access-control-allow-origin'], 'localhost', 'acao')
      t.equal(res.headers['access-control-allow-credentials'], 'false', 'acac')
      t.equal(res.headers['access-control-allow-headers'], 'Content-Type,Accept,X-Requested-With,X-Foo', 'acah')
      t.equal(res.headers['access-control-allow-methods'], 'PUT,POST,DELETE,GET,OPTIONS', 'acam')
      t.end()
    })
  })

  t.test('get', (t) => {
    request('get', '/', null, null, (err, res, body) => {
      t.error(err, 'no error')
      t.equal(res.statusCode, 200, 'no content')
      t.equal(res.headers['access-control-allow-origin'], 'localhost', 'acao')
      t.equal(res.headers['access-control-allow-credentials'], 'false', 'acac')
      t.equal(res.headers['access-control-allow-headers'], 'Content-Type,Accept,X-Requested-With,X-Foo', 'acah')
      t.equal(res.headers['access-control-allow-methods'], 'PUT,POST,DELETE,GET,OPTIONS', 'acam')
      t.end()
    })
  })

  t.test('teardown', (t) => {
    server.close()
    t.end()
  })
  t.end()
})

test('body parser', {skip: true}, (t) => {
  const server = TF({maxPost: 100})
  server.listen(3000)
  server.post('/', (req, res) => res.send(req.body))

  // can't seem to override content-length to report a false value in either
  // curl or the built-in http client. will have to do something with `net`
  // likely...
  t.test('too big', {skip: true}, (t) => {
    const big = 'a'.repeat(200)
    request('post', '/', big, {'content-type': 'application/json', 'content-length': 1}, (err, res, body) => {
      t.ok(err, 'errored')
      t.equal(res.statusCode, 413, 'too big')
      t.equal(body.message, 'Payload size exceeds maximum body length', 'too big')
      t.end()
    })
  })

  t.test('invalid json', (t) => {
    request('post', '/', 'wahoo []', {'content-type': 'application/json'}, (err, res, body) => {
      t.ok(err, 'got error')
      t.equal(res.statusCode, 400, 'invalid json')
      t.equal(body.message, 'Payload is not valid JSON', 'not valid')
      t.end()
    })
  })

  t.test('teardown', (t) => {
    server.close()
    t.end()
  })
  t.end()
})
