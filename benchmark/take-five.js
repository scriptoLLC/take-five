const five = require('../')
const server = five()
server.get('/test', (req, res) => {
  res.send({test: true})
})
server.listen(3000)
