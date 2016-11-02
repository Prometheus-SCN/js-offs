'use strict'
const EventEmitter = require('events').EventEmitter
const config = require('../config')
const BlockCache = require('./block-cache')
const Block = require('./block')
const ReadableOffStream = require('./readable-off-stream')
const WritableOffStream = require('./writable-off-stream')
const URL = require('./off-url')
const bs58 = require('bs58')
const RPC = require('./rpc')
const Peer = require('./peer')
const Messenger = require('udp-messenger')
const Bucket = require('./bucket')

let _bc = new WeakMap()
let _mc = new WeakMap()
let _nc = new WeakMap()
let _rpc = new WeakMap()

module.exports = class BlockRouter extends EventEmitter {
  constructor (path, peer, messenger) {
    if (!(peer instanceof Peer)) {
      throw new TypeError('Invalid Peer')
    }
    super()
    let bc = new BlockCache(path + config.blockPath, config.blockSize, config.blockCacheSize)
    let mc = new BlockCache(path + config.miniPath, config.miniBlockSize, config.miniBlockCacheSize)
    let nc = new BlockCache(path + config.nanoPath, config.nanoBlockSize, config.nanoBlockCacheSize)
    let bucket = new Bucket(peer.id, config.bucketSize)
    _bc.set(this, bc)
    _mc.set(this, mc)
    _nc.set(this, nc)
    let rpc = new RPC(peer, messenger, bucket, this.rpcInterface())
    _rpc.set(this, rpc)
    bc.on('promotion', (block)=> {
      this.emit('promotion', config.block, block)
    })
    mc.on('promotion', (block)=> {
      this.emit('promotion', config.mini, block)
    })
    nc.on('promotion', (block)=> {
      this.emit('promotion', config.nano, block)
    })
    bc.on('capacity', (capacity)=> {
      this.emit('capacity', config.block, capacity)
    })
    mc.on('capacity', (capacity)=> {
      this.emit('capacity', config.mini, capacity)
    })
    nc.on('capacity', (capacity)=> {
      this.emit('capacity', config.nano, capacity)
    })
    bc.on('full', ()=> {
      this.emit('full', config.block)
    })
    mc.on('full', (capacity)=> {
      this.emit('full', config.mini)
    })
    nc.on('full', (capacity)=> {
      this.emit('full', config.nano)
    })
  }

  createReadStream (url) {
    if (!(url instanceof URL)) {
      throw new TypeError('Invalid URL')
    }
    if (!url.streamLength) {
      throw new TypeError('URL must have a stream length')
    }
    if (url.streamLength >= config.blockSize) {
      let bc = _bc.get(this)
      return new ReadableOffStream(url, config.blockSize, bc)
    } else if (url.streamLength >= config.miniBlockSize) {
      let mc = _mc.get(this)
      return new ReadableOffStream(url, config.miniBlockSize, mc)
    } else {
      let nc = _nc.get(this)
      return new ReadableOffStream(url, config.nanoBlockSize, nc)
    }
  }

  createWriteStream (url) {
    if (!(url instanceof URL)) {
      throw new TypeError('Invalid URL')
    }
    if (!url.streamLength) {
      throw new TypeError('URL must have a stream length')
    }
    if (url.streamLength >= config.blockSize) {
      let bc = _bc.get(this)
      return new WritableOffStream(config.blockSize, { bc: bc, url: url })
    } else if (url.streamLength >= config.miniBlockSize) {
      let mc = _mc.get(this)
      return new WritableOffStream(config.miniBlockSize, { bc: mc, url: url })
    } else {
      let nc = _nc.get(this)
      return new WritableOffStream(config.nanoBlockSize, { bc: nc, url: url })
    }
  }

  rpcInterface () {
    let rpc = {}
    rpc.storeValueAt = (value, number, type, cb)=> {
      let bc
      let block
      switch (type) {
        case 1:
          bc = _bc.get(this)
          block = new Block(value, config.blockSize)
          break;
        case 2:
          bc = _mc.get(this)
          block = new Block(value, config.miniBlockSize)
          break;
        case 3:
          bc = _nc.get(this)
          block = new Block(value, config.nanoBlockSize)
          break;
      }
      bc.storeBlockAt(block, number, cb)
    }
    rpc.getValue = (hash, type, cb)=> {
      let bc
      switch (type) {
        case 1:
          bc = _bc.get(this)
          break;
        case 2:
          bc = _mc.get(this)
          break;
        case 3:
          bc = _nc.get(this)
          break;
      }
      let key = bs58.encode(hash)
      bc.get(key, (err, block, number)=> {
        if (err) {
          return process.nextTick(()=> {
            return cb(err)
          })
        }
        return process.nextTick(()=> {
          return cb(err, block.data, number)
        })
      })
    }
    rpc.getRandomAt = (number, filter, hash, type, cb) => {
      let bc
      switch (type) {
        case 1:
          bc = _bc.get(this)
          break;
        case 2:
          bc = _mc.get(this)
          break;
        case 3:
          bc = _nc.get(this)
          break;
      }
      let key = bs58.encode(hash)
      bc.closestBlockAt(number, key, filter, cb)
    }
    rpc.containsValue = (hash, type)=> {
      let bc
      switch (type) {
        case 1:
          bc = _bc.get(this)
          break;
        case 2:
          bc = _mc.get(this)
          break;
        case 3:
          bc = _nc.get(this)
          break;
      }
      let key = bs58.encode(hash)
      return bc.contains(key)
    }
    rpc.promoteValue = (hash, number, type, cb)=> {
      let bc
      switch (type) {
        case 1:
          bc = _bc.get(this)
          break;
        case 2:
          bc = _mc.get(this)
          break;
        case 3:
          bc = _nc.get(this)
          break;
      }
      let key = bs58.encode(hash)
      if (bc.contains(key)) {
        bc.get(key, (err, block)=> {
          if (err) {
            return process.nextTick(()=> {
              return cb(err)
            })
          }
          bc.storeBlockAt(block, number, cb)
        })
      } else {
        if (bc.number < number) {
          return process.nextTick(()=> {
            return cb('Find this block')
          })
        }
        process.nextTick(cb)
      }
    }
    rpc.containsValueAt = (number, hash, type) => {
      let bc
      switch (type) {
        case 1:
          bc = _bc.get(this)
          break;
        case 2:
          bc = _mc.get(this)
          break;
        case 3:
          bc = _nc.get(this)
          break;
      }
      let key = bs58.encode(hash)
      return bc.containsAt(number, key)
    }
    rpc.closestValueAt = (number, key, filter, type, cb) => {
      let bc
      switch (type) {
        case 1:
          bc = _bc.get(this)
          break;
        case 2:
          bc = _mc.get(this)
          break;
        case 3:
          bc = _nc.get(this)
          break;
      }
      bc.closestBlockAt(number, key, filter, cb)
    }
    rpc.storageCapacity = (type) => {
      let bc
      switch (type) {
        case 1:
          bc = _bc.get(this)
          break;
        case 2:
          bc = _mc.get(this)
          break;
        case 3:
          bc = _nc.get(this)
          break;
      }
      return bc.capacity
    }
    return rpc
  }

  cacheInterface (type) {
    let rpc = _rpc.get(this)
    let cache = {}
    cache.load= (keys)=>{
      if(!Array.isArray(keys)){
        throw new TypeError('Invalid Key Array')
      }
      let flightBox = new EventEmitter()
      let inflight = new CuckooFilter(keys.length,  )
      for(let i = 0; i < keys.length; i++){
        let key = keys[i]

        rpc.findValue(new Buffer(bs58.decode(key)), type, (err)=>{
          flightbox.emit(key)
        })
      }

    }
    return
    
  }
}
