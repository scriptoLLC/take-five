const test = require('tap').test
// const request = require('nanorequest')
// const stringify = require('fast-safe-stringify')
const TF = require('../')

test('http', (t) => {
  t.plan(1)
  const takeFive = new TF()
  takeFive.server.on('error', (err) => console.log(err))
  takeFive.listen(3000, () => {
    t.test('adding routes', (t) => {
      console.log('yooooooooooooooooooooooooooooooooooooooooooooooooo')
      t.doesNotThrow(() => {
        takeFive.get('/', (req, res, ctx) => ctx.send({hello: ['world']}))
        takeFive.post('/', (req, res, ctx) => ctx.send(201, req.body))
        takeFive.put('/:test', (req, res, ctx) => ctx.send(req.urlParams))
        takeFive.delete('/:test', (req, res, ctx) => ctx.send(req.params))
        takeFive.get('/err', (req, res, ctx) => ctx.err('broken'))
        takeFive.get('/err2', (req, res, ctx) => ctx.err(400, 'bad'))
        takeFive.get('/err3', (req, res, ctx) => ctx.err(418))
        takeFive.get('/next', [
          (req, res, ctx) => (res.statusCode = 202),
          (req, res, ctx) => ctx.send({message: 'complete'})
        ])
        takeFive.get('/end', [
          (req, res, ctx) => (res.statusCode = 418 && res.end()),
          (req, res, ctx) => t.fail('should never get called')
        ])
      }, 'added routes')
      takeFive.close()
      t.end()
    })
  })
})

/*
  t.test('ends response if no more paths', (t) => {
    sendRequest('get', '/next', null, null, (err, res, body) => {
      t.error(err, 'no error')
      t.equal(res.statusCode, 204, 'no content')
      t.end()
    })
  })

  t.test('does not call end twice', (t) => {
    sendRequest('get', '/end', null, null, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 418, 'teapot')
      t.end()
    })
  })

  t.test('not found', (t) => {
    sendRequest('get', '/bar/doo', null, null, (err, res, body) => {
      t.ok(err, 'errored')
      t.equal(res.statusCode, 404, 'not found')
      t.equal(body.message, 'Not Found', 'not found')
      t.end()
    })
  })

  t.test('get json', (t) => {
    sendRequest('get', '/', null, null, (err, res, body) => {
      t.error(err, 'no errors')
      t.equal(res.statusCode, 200, 'got a 200')
      t.deepEqual(body, {hello: ['world']}, 'hello, world')
      t.end()
    })
  })

  t.test('get namespace', (t) => {
    sendRequest('get', '/ns/foo', null, null, (err, res, body) => {
      t.error(err, 'no errors')
      t.equal(body.message, 'hello, world', 'returned')
      t.end()
    })
  })

  t.test('500 error', (t) => {
    sendRequest('get', '/err', null, null, (err, res, body) => {
      t.ok(err, 'errored')
      t.equal(res.statusCode, 500, 'default is 500')
      t.equal(body.message, 'broken', 'it is!')
      t.end()
    })
  })

  t.test('400 error', (t) => {
    sendRequest('get', '/err2', null, null, (err, res, body) => {
      t.ok(err, 'errored')
      t.equal(res.statusCode, 400, 'bad content')
      t.equal(body.message, 'bad', 'bad dudes')
      t.end()
    })
  })

  t.test('418 error', (t) => {
    sendRequest('get', '/err3', null, null, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 418, 'teapot')
      t.ok(/teapot/i.test(body.message), 'short and stout')
      t.end()
    })
  })

  t.test('post json', (t) => {
    sendRequest('post', '/', stringify({foo: 'bar'}), {'content-type': 'application/json'}, (err, res, body) => {
      t.error(err, 'no errors')
      t.equal(res.statusCode, 201, 'got a 201')
      t.deepEqual(body, {foo: 'bar'}, 'matches')
      t.end()
    })
  })

  t.test('post not-json', (t) => {
    sendRequest('post', '/', 'foo=bar', (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 415, 'content not allowed')
      t.equal(body.message, 'POST requests must be application/json not undefined', 'no match')
      t.end()
    })
  })

  t.test('post too large with header', (t) => {
    const headers = {'content-length': 512 * 2048, 'content-type': 'application/json'}
    sendRequest('post', '/', stringify({}), headers, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 413, 'too large')
      t.equal(body.message, `${512 * 2048} exceeds maximum size for requests`, 'too large')
      t.end()
    })
  })

  t.test('post multipart', (t) => {
    const headers = {'content-type': 'multipart/form-data'}
    sendRequest('post', '/', 'data goes here', headers, (err, res, body) => {
      t.error(err, 'no error')
      t.equal(res.statusCode, 200, 'is fine')
      t.end()
    })
  })

  t.test('put not-json', (t) => {
    sendRequest('put', '/', 'foo=bar', (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 415, 'content not allowed')
      t.equal(body.message, 'POST requests must be application/json not undefined', 'no match')
      t.end()
    })
  })

  t.test('put too large with header', (t) => {
    const headers = {'content-length': 512 * 2048, 'content-type': 'application/json'}
    sendRequest('put', '/', stringify({}), headers, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 413, 'too large')
      t.equal(body.message, `${512 * 2048} exceeds maximum size for requests`, 'too large')
      t.end()
    })
  })

  t.test('put no content', (t) => {
    const headers = {'content-length': 0, 'content-type': 'application/json'}
    sendRequest('put', '/', undefined, headers, (err, res, body) => {
      t.error(err)
      t.end()
    })
  })

  t.test('put with url params', (t) => {
    const headers = {'content-type': 'application/json'}
    sendRequest('put', '/foobar', '{}', headers, (err, res, body) => {
      t.error(err, 'no error')
      t.deepEqual(body, {test: 'foobar'}, 'params passed')
      t.end()
    })
  })

  t.test('delete with query params', (t) => {
    sendRequest('delete', '/foobar?beep=boop', null, null, (err, res, body) => {
      t.error(err, 'no error')
      t.deepEqual(body, {beep: 'boop'}, 'url parsed')
      t.end()
    })
  })

  t.test('teardown', (t) => {
    server.close()
    t.end()
  })

  t.end()
})

test('cors', (t) => {
  const server = five({cors: {
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
    sendRequest('options', '/', null, null, (err, res, body) => {
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
    sendRequest('get', '/', null, null, (err, res, body) => {
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

test('body parser', (t) => {
  const server = five({maxPost: 100})
  server.listen(3000)
  server.post('/', (req, res) => res.send(req.body))

  // can't seem to override content-length to report a false value in either
  // curl or the built-in http client. will have to do something with `net`
  // likely...
  t.test('too big', {skip: true}, (t) => {
    const big = 'a'.repeat(200)
    sendRequest('post', '/', big, {'content-type': 'application/json', 'content-length': 1}, (err, res, body) => {
      t.ok(err, 'errored')
      t.equal(res.statusCode, 413, 'too big')
      t.equal(body.message, 'Payload size exceeds maximum body length', 'too big')
      t.end()
    })
  })

  t.test('invalid json', (t) => {
    sendRequest('post', '/', 'wahoo []', {'content-type': 'application/json'}, (err, res, body) => {
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

test('middleware fail', (t) => {
  const server = five()
  server.use((req, res, next) => next(new Error()))
  server.get('/', (req, res) => res.err(500))
  server.listen(3000)

  t.test('middleware dies', (t) => {
    sendRequest('get', '/', null, null, (err, res, body) => {
      t.ok(err, 'error')
      t.equal(res.statusCode, 500, 'internal error')
      t.equal(body.message, 'Internal Server Error', 'internal')
      t.end()
    })
  })
  t.test('teardown', (t) => {
    server.close()
    t.end()
  })
  t.end()
})

test('multiple funcs on route', (t) => {
  const server = five()
  server.get('/', [testOne, testTwo])
  server.listen(3000)
  sendRequest('get', '/', null, null, (err, res, body) => {
    t.error(err, 'no errors')
    t.equal(res.statusCode, 200, 'yup')
    server.close()
    t.end()
  })

  function testOne (req, res, next) {
    t.ok(true, 'called test function one')
    next()
  }

  function testTwo (req, res, next) {
    t.ok(true, 'called test function two')
    res.send({message: 'yup'})
  }
})
*/
