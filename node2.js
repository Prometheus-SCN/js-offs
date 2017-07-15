const Peer = require('./src/peer')
const util= require('./src/utility')
const Bucket = require('./src/bucket')
const randomIP = require('random-ipv4')
const Messenger = require('./src/messenger')
const config = require('./src/config')
const BlockRouter = require('./src/block-router')
const Block = require('./src/block')
const RPC = require('./src/rpc')
const bs58= require('bs58')
const Cuckoo = require('cuckoo-filter').ScalableCuckooFilter
const OffUrl= require('./src/off-url')
const collect = require('collect-stream')

let id = new Buffer(32)
id.fill(40)
let thisNode =  new Peer(util.hash(id),'127.0.0.1', config.startPort+1)

let messenger = new Messenger(thisNode.port)
let blockRouter= new BlockRouter('./node2/', thisNode, messenger)
let peers =[]
/*
for(let i= 1; i < 32 ; i++){
  let id = new Buffer(32)
  id.fill(i)
  let peer = new Peer(util.hash(id),randomIP(), config.startPort)
  peers.push(peer)
  bucket.add(peer)
}*/

messenger.on('listening', ()=>{
  console.log(`listening on port: ${thisNode.port}`)
  let id = new Buffer(32)
  id.fill(0)
  let thatNode =  new Peer(util.hash(id),'127.0.0.1', config.startPort)
  blockRouter.connect(thatNode,(err)=>{
    if (err){
      throw err
    }
    let block = Block.randomBlock(config.nanoBlockSize)
    let url = new OffUrl()
    url.contentType = 'application/pdf'
    url.streamOffset = 0
    url.streamLength = 34514
    url.streamOffsetLength = 34514
    url.fileHash = '99yBwaxMU8VeQ4XN8f3MFt16A6UkJHf9gGRjEMyC68SR'
    url.descriptorHash = 'QmYX1zq4Rd9ryqgu7pdYUaEvVLdgqovYiChE23NZQuZeMJ'
    url.fileName = 'test.pdf'
    let rs = blockRouter.createReadStream(url)
    collect(rs, (err, data)=> {
      if (err) {
        throw err
      }
      console.log(data.toString('hex'))
    })
    /*
    rpc.store(block.hash, 3, block.data, 1, (err)=>{
     if(err){
       return console.log(err)
     }
      console.log('block stored')

    })
    */
    /*
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
    */
    /*
    rpc.promote(new Buffer(bs58.decode('QmaJcEWpNunMvZYwucGmbbXdoRkZnUF43U1CP3Mg5ngjdC')), 3, 2, ()=>{
      console.log('promotion issued')
    })
    */
    /*
    rpc.pingValue(new Buffer(bs58.decode('QmVEQhMp7w4BEzXfCnTWGfritiWAgfWamMxmLQ2n3SdACt')), new Buffer(bs58.decode('QmRuYJb5zKU7iWZFhRDhd6sJ7G8QrkzxDU9UnQssma9wXZ')),2,(err)=>{
      if(err){
       return console.log(err)
      }
      console.log('Value found')
    } )
    */
    /*
    rpc.pingStorage(new Buffer(bs58.decode('QmVEQhMp7w4BEzXfCnTWGfritiWAgfWamMxmLQ2n3SdACt')), 2,(err, capacity)=>{
      if(err){
        return console.log(err)
      }
      console.log(`capacity: ${capacity}%`)
    } )
    */
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

