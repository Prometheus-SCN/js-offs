'use strict'
const EventEmitter = require('events').EventEmitter
const config = require('./config')
const BlockCache = require('./block-cache')
const Block = require('./block')
const ReadableOffStream = require('./readable-off-stream')
const WritableOffStream = require('./writable-off-stream')
const Recycler = require('./recycler')
const URL = require('./off-url')
const bs58 = require('bs58')
const RPC = require('./rpc')
const Peer = require('./peer')
const Bucket = require('./bucket')
const cbor = require('cbor-js')
const toAb = require('to-array-buffer')
const abToB = require('arraybuffer-to-buffer')
const CuckooFilter = require('cuckoo-filter').CuckooFilter
const Scheduler = require('./scheduler')
const pth = require('path')
const fs = require('fs')

let _bc = new WeakMap()
let _mc = new WeakMap()
let _nc = new WeakMap()
let _rpc = new WeakMap()
let _scheduler = new WeakMap()
let _self = new WeakMap()
let _bucket = new WeakMap()
let _path = new WeakMap()
let _timeout = new WeakMap()

module.exports = class BlockRouter extends EventEmitter {
  constructor (path, peer) {
    if (typeof path !== 'string') {
      throw new TypeError('Invalid Path')
    }
    if (!(peer instanceof Peer)) {
      throw new TypeError('Invalid Peer')
    }
    super()
    let bucket = new Bucket(peer.id, config.bucketSize)
    _bucket.set(this, bucket)
    let rpc = new RPC(peer, bucket, this.rpcInterface())
    _rpc.set(this, rpc)
    _path.set(this, path)
    let bc = new BlockCache(pth.join(path, config.blockPath), config.blockSize, config.blockCacheSize, this.cacheInterface(config.block))
    let mc = new BlockCache(pth.join(path, config.miniPath), config.miniBlockSize, config.miniBlockCacheSize, this.cacheInterface(config.mini))
    let nc = new BlockCache(pth.join(path, config.nanoPath), config.nanoBlockSize, config.nanoBlockCacheSize, this.cacheInterface(config.nano))
    let scheduler = new Scheduler(rpc, bucket, bc, mc, nc)
    _bc.set(this, bc)
    _mc.set(this, mc)
    _nc.set(this, nc)
    _scheduler.set(this, scheduler)
    _self.set(this, peer)

    bc.on('block', (block)=> {
      rpc.store(block.hash, config.block, block.data, () => {})
    })
    mc.on('block', (block)=> {
      rpc.store(block.hash, config.mini, block.data, () => {})
    })
    nc.on('block', (block)=> {
      rpc.store(block.hash, config.nano, block.data, () => {})
    })
    bc.on('full', () => {
      this.emit('full', config.block)
    })
    mc.on('full', () => {
      this.emit('full', config.mini)
    })
    nc.on('full', () => {
      this.emit('full', config.nano)
    })
    bc.on('capacity', (capacity) => {
      this.emit('capacity', config.block, capacity)
    })
    mc.on('capacity', (capacity) => {
      this.emit('capacity', config.mini, capacity)
    })
    nc.on('capacity', (capacity) => {
      this.emit('capacity', config.nano, capacity)
    })
    bucket.on('removed', () => {
      this.emit('connection', bucket.count)
      this.savePeers()
    })
    bucket.on('added', () => {
      this.emit('connection', bucket.count)
      this.savePeers()
    })
    bucket.on('updated', () => {
      this.savePeers()
    })
  }

  createWriteStreamWithRecycler (url, urls, temporary) {
    if (!(url instanceof URL)) {
      throw new TypeError('Invalid URL')
    }
    if (!url.streamLength) {
      throw new TypeError('URL must have a stream length')
    }
    if (url.streamLength >= config.blockSize) {
      let bc = _bc.get(this)
      let recycler = new Recycler(config.blockSize, urls, bc, this)
      return new WritableOffStream(config.blockSize, { bc, url, recycler, temporary })
    } else if (url.streamLength >= config.miniBlockSize) {
      let mc = _mc.get(this)
      let recycler = new Recycler(config.miniBlockSize, urls, mc, this)
      return new WritableOffStream(config.miniBlockSize, { bc: mc, url, recycler, temporary })
    } else {
      let nc = _nc.get(this)
      let recycler = new Recycler(config.nanoBlockSize, urls, nc, this)
      return new WritableOffStream(config.nanoBlockSize, { bc: nc, url, recycler, temporary })
    }
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

  createWriteStream (url, temporary) {
    if (!(url instanceof URL)) {
      throw new TypeError('Invalid URL')
    }
    if (!url.streamLength) {
      throw new TypeError('URL must have a stream length')
    }
    if (url.streamLength >= config.blockSize) {
      let bc = _bc.get(this)
      return new WritableOffStream(config.blockSize, { bc: bc, url: url, temporary })
    } else if (url.streamLength >= config.miniBlockSize) {
      let mc = _mc.get(this)
      return new WritableOffStream(config.miniBlockSize, { bc: mc, url: url, temporary })
    } else {
      let nc = _nc.get(this)
      return new WritableOffStream(config.nanoBlockSize, { bc: nc, url: url, temporary })
    }
  }

  releaseTemporaries (url) {
    if (!(url instanceof URL)) {
      throw new TypeError('Invalid URL')
    }
    if (!url.streamLength) {
      throw new TypeError('URL must have a stream length')
    }
    if (url.streamLength >= config.blockSize) {
      let bc = _bc.get(this)
      bc.releaseTemporaries(url.fileHash + url.descriptorHash)
    } else if (url.streamLength >= config.miniBlockSize) {
      let mc = _mc.get(this)
      mc.releaseTemporaries(url.fileHash + url.descriptorHash)
    } else {
      let nc = _nc.get(this)
      nc.releaseTemporaries(url.fileHash + url.descriptorHash)
    }
  }

  removeTemporaries (url, cb) {
    if (!(url instanceof URL)) {
     return cb(new TypeError('Invalid URL'))
    }
    if (!url.streamLength) {
      return cb(new TypeError('URL must have a stream length'))
    }
    if (url.streamLength >= config.blockSize) {
      let bc = _bc.get(this)
      bc.releaseTemporaries(url.fileHash + url.descriptorHash, cb)
    } else if (url.streamLength >= config.miniBlockSize) {
      let mc = _mc.get(this)
      mc.releaseTemporaries(url.fileHash + url.descriptorHash, cb)
    } else {
      let nc = _nc.get(this)
      nc.releaseTemporaries(url.fileHash + url.descriptorHash, cb)
    }
  }

  rpcInterface () {
    let rpc = {}
    rpc.storeValue = (value, type, cb)=> {
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
      bc.put(block, cb)
    }
    rpc.getValue = (hash, type, cb) => {
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
      bc.get(key, (err, block) => {
        if (err) {
          return cb(err)
        }
        return cb(err, block.data)
      })
    }
    rpc.closestBlock = (hash, filter, type, cb) => {
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
      bc.closestBlock(key, filter, cb)
    }
    rpc.containsValue = (hash, type, cb)=> {
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
      return bc.contains(key, cb)
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
          rpc.findValue(bs58.decode(key), type, (err)=> {
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
      process.nextTick(next)
      return flightBox
    }
    return cache

  }

  connect (peer, cb) {
    let rpc = _rpc.get(this)
    rpc.connect(peer, cb)
  }

  bootstrap (cb) {
    let self = _self.get(this)
    let connect = () => {
      let i = -1
      let next = (err) => {
        if (err) {
          this.emit('error', err)
        }
        i++
        if (i < config.bootstrap.length) {
          let obj = config.bootstrap[ i ]
          if (obj.id === self.key) {
            return next()
          }
          obj.id = bs58.decode(obj.id)
          let peer = Peer.fromJSON(obj)
          this.connect(peer, next)
        } else { //Fill routing table with the closet nodes to themselves
          let rpc = _rpc.get(this)
          let self = _self.get(this)
          rpc.findNode(self.id, cb)
        }
      }
      next()
    }
    let bootstrap
    // This option is selected Bootstrap to whomever we were last online with
    if (config.lastKnownPeers) {
      bootstrap = config.bootstrap
      let path = _path.get(this)
      let fd = pth.join(path, '.bucket')
      fs.readFile(fd, (err, bucketFile) => {
        if (err) {
          this.emit(err)
          return connect()
        }
        if (bucketFile) {
          let peers = cbor.decode(toAb(buf))
          for (let peer of peers) {
            let index = bootstrap.findIndex((boot) => peer.id === boot.id)
            if (index === -1) {
              bootstrap.push(boot)
            } else {
              bootstrap.splice(index, 1, peer)
            }
          }
          return connect()
        } else {
          return connect()
        }
      })
    } else {
      bootstrap = config.bootstrap
      return connect()
    }
  }

  savePeers () {
    let timeout = _timeout.get(this)
    if (timeout) {
      clearTimeout(timeout)
    } else {
      let timeout = setTimeout(() => {
        let bucket = _bucket.get(this)
        let peers = bucket.toArray()
        peers = peers.map((peer => () => peer.toJSON()))
        let buf = abToB(cbor.encode(peers))
        let path = _path.get(this)
        let fd = pth.join(path, '.bucket')
        fs.writeFile(buf, fd, (err) => {
          if (err) {
            this.emit('error', err)
          }
        })
      }, config.peerTimeout)
      _timeout.set(this, timeout)
    }
  }

  listen () {
    let rpc = _rpc.get(this)
    rpc.listen()
  }

  get blockCapacity () {
    let bc = _bc.get(this)
    return bc.capacity
  }

  get miniCapacity () {
    let mc = _mc.get(this)
    return mc.capacity
  }

  get nanoCapacity () {
    let nc = _nc.get(this)
    return nc.capacity
  }

  get connections () {
    let bucket = _bucket.get(this)
    return bucket.count
  }
}
