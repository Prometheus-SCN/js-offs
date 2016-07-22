const express = require('express')
const

off = express()

off.use('/offsystem', express.static('wwww'))
off.get('/', (req, res)=>{
  res.redirect('/offsystem')
})
off.get('/', (req, res)=>{
  res.redirect('/offsystem')
})

off.put('/offsystem', (req, res)=>{
  req.files.displayImage.path
})