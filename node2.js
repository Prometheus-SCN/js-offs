const Peer = require('./src/peer')
const util= require('./src/utility')
const Bucket = require('./src/bucket')
const randomIP = require('random-ipv4')
const Messenger = require('udp-messenger')
const config = require('./config')
const BlockRouter = require('./src/block-router')
const Block = require('./src/block')
const RPC = require('./src/rpc')
const bs58= require('bs58')
const Cuckoo = require('cuckoo-filter').ScalableCuckooFilter

let id = new Buffer(32)
id.fill(40)
let thisNode =  new Peer(util.hash(id),'127.0.0.1', config.startPort+1)
let bucket = new Bucket(thisNode.id, 20)
let messenger = new Messenger(config.timeout, thisNode.port, config.packetSize)
let blockRouter= new BlockRouter('./node2/')
let peers =[]
/*
for(let i= 1; i < 32 ; i++){
  let id = new Buffer(32)
  id.fill(i)
  let peer = new Peer(util.hash(id),randomIP(), config.startPort)
  peers.push(peer)
  bucket.add(peer)
}*/
let rpc = new RPC(thisNode, messenger,bucket, blockRouter.rpcInterface())
messenger.on('listening', ()=>{
  console.log(`listening on port: ${thisNode.port}`)
  let id = new Buffer(32)
  id.fill(0)
  let thatNode =  new Peer(util.hash(id),'127.0.0.1', config.startPort)
  rpc.connect(thatNode,(err)=>{
    if (err){
      throw err
    }
    let block = Block.randomBlock(config.nanoBlockSize)
    /*
    rpc.store(block.hash, 3, block.data, 1, (err)=>{
     if(err){
       return console.log(err)
     }
      console.log('block stored')

    })
    */
    let filter = new Cuckoo()
    filter.add('stuff')
    let cbor = filter.toCBOR()
    filter= Cuckoo.fromCBOR(cbor)
    rpc.random(0, 1, 2, filter, (err)=>{
      if(err){
        return console.log(err)
      }
      console.log('random received')

    })

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

