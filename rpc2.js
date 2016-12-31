const rpc = require('./src/rpc')
const Peer = require('./src/peer')
const config = require('./config')
const collect= require('collect-stream')
const BlockRouter = require('./src/block-router')
const util= require('./src/utility')
const OffUrl = require('./src/off-url')
const fs = require('fs')
const mime = require('mime')

let id = new Buffer(32)
id.fill(1)
let id2 = new Buffer(32)
id2.fill(0)
let thisNode =  new Peer(util.hash(id),'127.0.0.1', config.startPort + 1)
let thatNode =  new Peer(util.hash(id2),'127.0.0.1', config.startPort)
console.log(`I am node ${thisNode.key}`)
let blockRouter = new BlockRouter('./node2/', thisNode)
blockRouter.on('promotion', (number, block)=>{
  console.log(`promoted: ${block.key}`)
})
blockRouter.on('capacity', (type, capacity)=>{
  console.log(`type:${type} capacity: ${capacity}`)
})
blockRouter.on('full', (type)=>{
  console.log(`full:${type}`)
})
blockRouter.listen()
blockRouter.connect(thatNode, (err) => {
  if(err){
    //throw err
  }
  fs.readFile('./src/test.pdf', (err, data)=> {
    if (err) {
      throw err
    }
    let url = new OffUrl()
    let br = blockRouter
    let rs = fs.createReadStream('./src/test.pdf')
    url.fileName = 'test.pdf'
    url.contentType = mime.lookup('test.pdf')
    url.streamLength = data.length
    let ws = br.createWriteStream(url)
    ws.on('error', (err)=>{
      console.log(err)
    })
    ws.on('url', (url)=> {
      console.log(url.toString())
      console.log(url.descriptorHash)
    })
    rs.pipe(ws)
  })
})