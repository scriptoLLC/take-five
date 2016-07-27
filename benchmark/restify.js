const restify = require('restify')
const server = restify.createServer()
server.get('/test', (req, res) => {
  res.send({test: true})
})
server.listen(3000)
