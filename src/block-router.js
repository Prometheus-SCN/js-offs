'use strict'
const EventEmitter = require('events').EventEmitter
const config = require('../config')
const BlockCache = require('./block-cache')
const Block = require('./block')
const ReadableOffStream = require('./readable-off-stream')
const WritableOffStream = require('./writable-off-stream')
const URL = require('./off-url')
const bs58 = require('bs58')
let _bc = new WeakMap()
let _mc = new WeakMap()
let _nc = new WeakMap()

module.exports = class BlockRouter extends EventEmitter {
  constructor (path) {
    super()
    let bc = new BlockCache(path + config.blockPath, config.blockSize)
    let mc = new BlockCache(path + config.miniPath, config.miniBlockSize)
    let nc = new BlockCache(path + config.nanoPath, config.nanoBlockSize)
    bc.on('promotion', (block)=> {
      this.emit('promotion', config.block, block)
    })
    mc.on('promotion', (block)=> {
      this.emit('promotion', config.mini, block)
    })
    nc.on('promotion', (block)=> {
      this.emit('promotion', config.nano, block)
    })
    _bc.set(this, bc)
    _mc.set(this, mc)
    _nc.set(this, nc)
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
    return rpc
  }
}
