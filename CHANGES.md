# Version 2.0.0
* Removed middleware
  * `next` is no longer the third arugments to routes, this has been replaced with `ctx`
  * If you need middleware, just provide an array of functions to the router
* Enabled the ability to create an HTTPS server
  * Passing in `opts.http.{key, ca, cert}` will now make an HTTPS server
* The built-in `HTTPServer`, `Request` and `Response` objects are no longer modified
  * The `ctx` object now contains the keys previously placed into `req` and `res`
  * The result of `new TakeFive()` is a TakeFive object. The underlying node server instance may be accessed via `.server` on the resulting object

# Version 1.3.4
* Update deps from greenkeeper

# Version 1.3.3
* Fix a typo preventing `cors` options from being overridden

# Version 1.3.2
* Fix bug where zero-length bodies would attempt to be parsed

# Version 1.3.1
* Fix bug where we sent a pre-generated content-length header that caused issues with `.pipe(res)`

# Version 1.3.0
* Add `Access-Control-Allow-Methods` to CORS options

# Version 1.2.0
* Make sure to always call `res.end`

# Version 1.1.1
* First useable release. Added license & benchmarks
