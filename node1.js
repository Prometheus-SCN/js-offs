const Peer = require('./src/peer')
const util= require('./src/utility')
const Bucket = require('./src/bucket')
const randomIP = require('random-ipv4')
const Messenger = require('udp-messenger')
const config = require('./config')
const BlockRouter = require('./src/block-router')
const OffUrl = require('./src/off-url')
const mime = require('mime')
const fs = require('fs')
const RPC = require('./src/rpc')

let id = new Buffer(32)
id.fill(0)
let thisNode =  new Peer(util.hash(id),'127.0.0.1', config.startPort)
let bucket = new Bucket(thisNode.id, 20)
let messenger = new Messenger(config.timeout, thisNode.port, config.packetSize)
let blockRouter= new BlockRouter('./node1/')
blockRouter.on('promotion', (number, block)=>{
  console.log(`promoted: ${block.key}`)
})
blockRouter.on('capacity', (type, capacity)=>{
  console.log(`type:${type} capacity: ${capacity}`)
})

blockRouter.on('full', (type)=>{
  console.log(`full:${type}`)
})
let peers =[]
for(let i= 1; i < 5 ; i++){
  let id = new Buffer(32)
  id.fill(i)
  let peer = new Peer(util.hash(id),randomIP(), config.startPort)
  peers.push(peer)
  bucket.add(peer)
}
let rpc = new RPC(thisNode, messenger,bucket, blockRouter.rpcInterface())
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
console.log(bucket.toString())
