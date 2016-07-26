# take-five

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
** `opts.cors.headers?:array(string)`: an array of headers to accept besides the default. Default: `Content-Type`, `Accept`, `X-Requested_with`
** `opts.cors.origin?:string`: What origin(s) are accepted. Deafult: `*`
** `opts.cors.credentials?:boolean`: Allow or deny credentials. Default: `true`

### `Five#use(middleware:function)`
Add a new middleware to the stack.  Middleware will be processed in the order in
which they are added, which means they will be run after the built-in middleware.

* `middleware(request:object, response:object, next:function):function` -You must either call `next` or send data to the client when you are finshed.

### `Five#get(route:string, handler:function)`
### `Five#post(route:string, handler:function)`
### `Five#put(route:string, handler:function)`
### `Five#delete(route:string, handler:function)`
Add a new route to the server. Routes may be added after the server has been
started.

* `route:string` A [wayfarer](https://github.com/yoshuawuyts/wayfarer) route definition.
* `handler(request:object, response:object):function`: The handler for this route.

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

### License
Copyright © 2016 Scripto LLC, Todd Kennedy. Reuse permitted under the Apache-2.0 license
