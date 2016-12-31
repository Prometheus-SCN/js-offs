const rpc = require('./src/rpc')
const Peer = require('./src/peer')
const config = require('./config')
const net = require('net')
const collect= require('collect-stream')
const Bucket = require('./src/bucket')
const util= require('./src/utility')
const BlockRouter = require('./src/block-router')
const OffUrl= require('./src/off-url')
const bs58= require('bs58')

let id = new Buffer(32)
id.fill(0)
let thisNode =  new Peer(util.hash(id),'127.0.0.1', config.startPort)
console.log(`I am node ${thisNode.key}`)
let blockRouter = new BlockRouter('./node1/', thisNode)
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

setTimeout(() => {
  /*
  let url = new OffUrl()
  url.contentType = 'application/pdf'
  url.streamOffset = 0
  url.streamLength = 34514
  url.streamOffsetLength = 34514
  url.fileHash = '99yBwaxMU8VeQ4XN8f3MFt16A6UkJHf9gGRjEMyC68SR'
  url.descriptorHash = 'QmQ3pB9QeBWk8Pnb5YH4Kc8miNXfuhqXQu7xmaK8rdESS7'
  url.fileName = 'test.pdf'
  let rs = blockRouter.createReadStream(url)
  collect(rs, (err, data)=> {
    if (err) {
      throw err
    }
    console.log(data.toString('hex'))
  })*/
  /*
  blockRouter.mini.contentFilter((err, contentFilter)=> {
    if(err){
      throw err
    }
    blockRouter.rpc.random(0, 1, config.mini, contentFilter, (err)=> {
      if (err){
        throw err
      }
      console.log('success')
    })
  })
  *//*
  let id = new Buffer(bs58.decode('QmW4nsXQFRqVVuFzkHfFaxxUkM9soTNQQEsD7qXpFLLJGa'))
  let hash = new Buffer(bs58.decode('QmQ3pB9QeBWk8Pnb5YH4Kc8miNXfuhqXQu7xmaK8rdESS7'))
  blockRouter.rpc.pingValue(id, hash, 2, (err) => {
    if(err){
      throw err
    }
    console.log('success')
  })
  */
  /*let id = new Buffer(bs58.decode('QmW4nsXQFRqVVuFzkHfFaxxUkM9soTNQQEsD7qXpFLLJGa'))
  let hash = new Buffer(bs58.decode('QmQ3pB9QeBWk8Pnb5YH4Kc8miNXfuhqXQu7xmaK8rdESS7'))
  blockRouter.rpc.pingStorage(id,  2, (err, capacity) => {
    if(err){
      throw err
    }
    console.log('success', capacity)
  })*/

}, 10000)