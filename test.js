const tk = require('.')
const s = tk()
s.get('/', (req, res) => res.send('hi'))
s.listen(3000)
