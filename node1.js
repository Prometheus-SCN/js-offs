const heapdump= require('heapdump')
const Peer = require('./src/peer')
const util= require('./src/utility')
const Bucket = require('./src/bucket')
const randomIP = require('random-ipv4')
const Messenger = require('./src/messenger')
const config = require('./config')
const BlockRouter = require('./src/block-router')
const OffUrl = require('./src/off-url')
const mime = require('mime')
const fs = require('fs')
const RPC = require('./src/rpc')
setTimeout(()=>{heapdump.writeSnapshot()},120000)
setTimeout(()=>{heapdump.writeSnapshot()},60000)
setTimeout(()=>{heapdump.writeSnapshot()},90000)
let id = new Buffer(32)
id.fill(0)
let thisNode =  new Peer(util.hash(id),'127.0.0.1', config.startPort)
console.log(`I am node ${thisNode.key}`)
let messenger = new Messenger(thisNode.port)
let blockRouter= new BlockRouter('./node1/', thisNode, messenger)
blockRouter.on('promotion', (number, block)=>{
  console.log(`promoted: ${block.key}`)
})
blockRouter.on('capacity', (type, capacity)=>{
  console.log(`type:${type} capacity: ${capacity}`)
})

blockRouter.on('full', (type)=>{
  console.log(`full:${type}`)
})

messenger.on('listening', ()=>{
  console.log(`listening on port: ${thisNode.port}`)
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
messenger.on('error', (err)=>{
  console.log(err)
})
messenger.on('dropped', (err)=>{
  console.log(err)
  console.log('message dropped')
})
messenger.listen()
