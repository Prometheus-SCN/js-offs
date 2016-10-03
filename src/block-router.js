'use strict'
const config = require('../config')
const BlockCache = require('./block-cache')
const ReadableOffStream = require('./readable-off-stream')
const WritableOffStream = require('./writable-off-stream')
const URL = require('./off-url')
let _bc = new WeakMap()
let _mc = new WeakMap()
let _nc = new WeakMap()

module.exports = class BlockRouter {
  constructor () {
    let bc = new BlockCache(config.blockPath, config.blockSize)
    let mc = new BlockCache(config.miniPath, config.miniBlockSize)
    let nc = new BlockCache(config.nanoPath, config.nanoBlockSize)
    _bc.set(this, bc),
    _mc.set(this, mc)
    _nc.set(this, mc)
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
      return new ReadableOffStream(url, config.miniBlockSize,  mc)
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
}
