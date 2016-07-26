const http = require('http')
const test = require('tap').test
const stringify = require('fast-safe-stringify')
const five = require('../')

function sendRequest (method, path, body, headers, cb) {
  if (typeof headers === 'function') {
    cb = headers
    headers = {}
  }

  const opts = {
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: method,
    headers
  }

  http.request(opts, (res) => {
    const body = []
    let err = false
    if (res.statusCode > 299) {
      err = true
    }
    res.on('data', (chk) => body.push(chk.toString('utf8')))
    res.on('end', () => {
      let content
      try {
        content = JSON.parse(body.join(''))
      } catch (e) {
        err = true
        content = e
      }

      if (err) {
        const error = new Error()
        cb(error, res, content)
      } else {
        cb(null, res, content)
      }
    })
  }).end(body)
}

test('take five', (t) => {
  const server = five()
  server.on('error', (err) => console.log(err))
  server.listen(3000)
  t.test('adding routes', (t) => {
    t.doesNotThrow(() => {
      server.get('/', (req, res) => res.send({hello: ['world']}))
      server.post('/', (req, res) => res.send(201, req.body))
      server.put('/:test', (req, res) => res.send(req.urlParams))
      server.delete('/:test', (req, res) => res.send(req.params))
      server.get('/err', (req, res) => res.err('broken'))
      server.get('/err2', (req, res) => res.err(400, 'bad'))
      server.get('/err3', (req, res) => res.err(418))
      const router = server.router('ns')
      router.get('/foo', (req, res) => res.send({message: 'hello, world'}))
    }, 'added routes')
    t.end()
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
      t.equal(body.message, 'I\'m a teapot', 'short and stout')
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
