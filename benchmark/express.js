const express = require('express')
const app = express()
app.get('/test', (req, res) => {
  res.json({test: true})
})
app.listen(3000)
