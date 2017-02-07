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
const Bucket = require('./bucket')
const util = require('util')
const CuckooFilter = require('cuckoo-filter').CuckooFilter
const Scheduler = require('./scheduler')

let _bc = new WeakMap()
let _mc = new WeakMap()
let _nc = new WeakMap()
let _rpc = new WeakMap()
let _scheduler = new WeakMap()

module.exports = class BlockRouter extends EventEmitter {
  constructor (path, peer) {
    if (!(peer instanceof Peer)) {
      throw new TypeError('Invalid Peer')
    }
    super()
    let bucket = new Bucket(peer.id, config.bucketSize)
    let rpc = new RPC(peer, bucket, this.rpcInterface())
    _rpc.set(this, rpc)
    let bc = new BlockCache(path + config.blockPath, config.blockSize, config.blockCacheSize, this.cacheInterface(config.block))
    let mc = new BlockCache(path + config.miniPath, config.miniBlockSize, config.miniBlockCacheSize, this.cacheInterface(config.mini))
    let nc = new BlockCache(path + config.nanoPath, config.nanoBlockSize, config.nanoBlockCacheSize, this.cacheInterface(config.nano))
    let scheduler = new Scheduler(rpc, bucket, bc, mc, nc)
    _bc.set(this, bc)
    _mc.set(this, mc)
    _nc.set(this, nc)
    _scheduler.set(this, scheduler)

    bc.on('block', (block)=> {
      rpc.store(block.hash, config.block, block.data, 1, ()=> {})
    })
    mc.on('block', (block)=> {
      rpc.store(block.hash, config.mini, block.data, 1, ()=> {})
    })
    nc.on('block', (block)=> {
      rpc.store(block.hash, config.nano, block.data, 1, ()=> {})
    })
    bc.on('promote', (block, number)=> {
      process.nextTick(()=> {
        rpc.promote(block.hash, number, config.block, ()=> {})
      })
    })
    mc.on('promote', (block, number)=> {
      process.nextTick(()=> {
        rpc.promote(block.hash, number, config.mini, ()=> {})
      })
    })
    nc.on('promote', (block, number)=> {
      process.nextTick(()=> {
        rpc.promote(block.hash, number, config.nano, ()=> {})
      })
    })
    bc.on('full', ()=> {
      this.emit('full', config.block)
    })
    mc.on('full', ()=> {
      this.emit('full', config.mini)
    })
    nc.on('full', ()=> {
      this.emit('full', config.nano)
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
        bc.get(key, (err, block, num)=> {
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
    cache.load = (keys)=> {
      if (!Array.isArray(keys)) {
        throw new TypeError('Invalid Key Array')
      }
      let flightBox = {
        filter: new CuckooFilter(keys.length + Math.ceil(keys.length * .05), 4, 8),
        emitter: new EventEmitter()
      }//add 5% to decrease collision probability
      for (let i = 0; i < keys.length; i++) {
        flightBox.filter.add(keys[ i ])
      }
      let i = -1
      let next = ()=> {
        i++
        if (i < keys.length) {
          let key = keys[ i ]
          rpc.findValue(new Buffer(bs58.decode(key)), type, (err)=> {
            flightBox.filter.remove(key)
            if (err) {
              return flightBox.emitter.emit('error', err)
            }
            flightBox.emitter.emit(key)
            flightBox.filter.remove('key')
            return err ? null : next()//do next after callback
          })
        }
      }
      next()
      return flightBox
    }
    return cache

  }

  connect (peer, cb) {
    let rpc = _rpc.get(this)
    rpc.connect(peer, cb)
  }

  listen () {
    let rpc = _rpc.get(this)
    rpc.listen()
  }

  get blockCapacity(){
    let bc = _bc.get(this)
    return bc.capacity
  }

  get miniCapacity(){
    let mc = _mc.get(this)
    return mc.capacity
  }

  get nanoCapacity(){
    let nc = _nc.get(this)
    return nc.capacity
  }

}
