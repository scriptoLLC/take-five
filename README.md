# take-five

[![Greenkeeper badge](https://badges.greenkeeper.io/scriptoLLC/take-five.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/scriptoLLC/take-five.svg?branch=master)](https://travis-ci.org/scriptoLLC/take-five) [![NSP Status](https://nodesecurity.io/orgs/scriptollc/projects/24857fc4-2472-446e-ac2d-5a0f5913503d/badge)](https://nodesecurity.io/orgs/scriptollc/projects/24857fc4-2472-446e-ac2d-5a0f5913503d) [![Coverage Status](https://coveralls.io/repos/github/scriptoLLC/take-five/badge.svg?branch=master)](https://coveralls.io/github/scriptoLLC/take-five?branch=master)

A minimal REST server that deals solely with JSON payloads that automatically
handles CORS requests and limits the size of a POST bodies.

## Installation

```
npm install -S take-five
```

## Usage

```js
const five = require('take-five')
const server = five()
server.get('/', (req, res) => res.send('Hello, world'))
server.post('/', (req, res) => res.send(req.body))
server.listen(3000)
```

```
curl -X GET localhost:3000
Hello, world
curl -X POST localhost:3000 -H 'content-type: application/json' -d '{"hello": "world"}'
{"hello": "world"}
```

## API

### `five(opts?:object):object`
Create and return a new HTTP server object.

* `opts.maxPost?:number`: the max size for a payload. Default: 512kb
* `opts.cors?:object`
    * `opts.cors.headers?:array(string)`: an array of headers to accept besides the default. Default: `Content-Type`, `Accept`, `X-Requested-With`
    * `opts.cors.origin?:string`: What origin(s) are accepted. Deafult: `*`
    * `opts.cors.credentials?:boolean`: Allow or deny credentials. Default: `true`
    * `opts.cores.methods?array(string)`: an array of methods to accept besides the default. Default: `PUT`, `POST`, `DELETE`, `GET`, `OPTIONS`

### `Five#use(middleware:function)`
Add a new middleware to the stack.  Middleware will be processed in the order in
which they are added, which means they will be run after the built-in middleware.

* `middleware(request:object, response:object, next:function):function` -You must either call `next` or send data to the client when you are finshed.

Since the middleware signature is the same express/restify, you *might* be able to use existing middleware with take-five, but ymmv.

### `Five#router(namespace:string):object`
Namespace routes. All routes defined off this router will be prefixed with the supplied
namespace.  The methods have the same signature as the router provided.

### `Five#get(route:string, handler:(function|array(function)))`
### `Five#post(route:string, handler:(function|array(function)))`
### `Five#put(route:string, handler:(function|array(function)))`
### `Five#delete(route:string, handler:(function|array(function)))`
Add a new route to the server. Routes may be added after the server has been
started. You can supply either a single function or an array of functions to call.
The array will be traversed in the order it is supplied

* `route:string` A [wayfarer](https://github.com/yoshuawuyts/wayfarer) route definition.
* `handler(request:object, response:object, next:function):function`: The handler for this route.

Since this is an augmented instance of [http.Server](https://nodejs.org/api/http.html#http_class_http_server)
all methods and properties are available on this as well.

### `request:object`
The [`http.IncomingMessage`](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
object extended with:

* `params?:object`: query parameters from the URL (if any)
* `urlParams?:object`: Named parameters from the route definition as provided by wayfarer
* `body?:object`: The parsed JSON body available on POST requests

### `response:object`
The [`http.ServerResponse`](https://nodejs.org/api/http.html#http_class_http_serverresponse)
object augmented with two additional methods. The defaults for sending messages are
`content-type: application/json` and `statusCode: 200`.  The header may be overridden by
calling `res.header`. The statusCode can be provided when calling the `send` method.

* `send(statusCode?:number, body?:(string|object)):function`: Send a response.
* `err(statusCode?:number, message?:string):function`: Send an error. If no status code is provided it will default to a 500 error.  If no message is provided, it will use the default message for that status code. The message will be wrapped in a JSON object under the key `message`

### `next:function`
If you are done processing the request, but you want a later handler to be able to modify the response, call next.  This will invoke the next handler in the stack. If there are no more handlers left, it will call `res.end()` and send the response as is.  If you want to immediately send the response, you can call `res.end`, `res.send` or `res.err` directly.


## Do we need another REST server?
Probably not, but [`restify`](http://restify.com), [`hapi`](http://hapijs.com) and [`express`](http://expressjs.com) are all over-kill on the types of services I'm building for the most part.
* Setting up CORS is difficult or laborious: most REST services need to support CORS, this should be enabled by default (and easily configurable)
* It has no need to accept anything other than `application/json` payloads, and doesn't need the cruft associated with other payload types.
* By default it woill respond with `application/json` as well, but allow it be override-able if needed
* Should be trivial to reject large payloads to prevent DOS attacks
* Each route should have the ability to have multiple placeholders, regardless of the payload type
* It should be as fast as possible

I found that the other three projects aim to support way more than this, which means supporting these features involves jumping through hoops or installing a ton of
various other packages.

There are some scripts used for the (extremely reductive) benchmarking in `/benchmark`. Using my Core-i7, I get the following data using `wrk -t12 -c400 -d30s http://localhost:3000/test`. You might see different results. As with all benchmarks, these are likely indicative of nothing!

```
take-five: Requests/sec:  20296.63
express: Requests/sec:  10974.18
restify: Requests/sec:   9201.09
```

## License
Copyright © 2016 Scripto LLC, Todd Kennedy. Reuse permitted under the Apache-2.0 license
