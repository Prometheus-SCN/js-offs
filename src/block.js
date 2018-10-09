'use strict'
const util = require('./utility')
const crypto = require('crypto')
const xor = require('buffer-xor')
const bs58 = require('bs58')

let _data = new WeakMap()
let _key = new WeakMap()
let _hash = new WeakMap()
let _blockSize = new WeakMap()

function randomPad (buf, blockSize) {
  let random = crypto.randomBytes(blockSize - buf.length)
  return Buffer.concat([ buf, random ])
}
module.exports = class Block {
  constructor (data, blockSize) {
    if (!data) {
      throw new TypeError('Block must be constructed with data')
    }
    if (!Number.isInteger(blockSize)) {
      throw new TypeError('Block size must be an integer')
    }
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    if (data.length > blockSize) {
      throw new Error('Invalid block size for this data size')
    }
    if (data.length < blockSize) {
      data = randomPad(data, blockSize)
    }
    _data.set(this, data)
    _blockSize.set(this, blockSize)
  }

  get data () {
    return _data.get(this).slice(0)
  }

  get hash () {
    let hash = _hash.get(this)
    if (hash) {
      return hash.slice(0)
    } else {
      hash = util.hash(this.data)
      _hash.set(this, hash)
      return hash.slice(0)
    }
  }

  get key () {
    let key = _key.get(this)
    if (key) {
      return key
    } else {
      key = bs58.encode(this.hash)
      _key.set(this, key)
      return key
    }
    return _key.get(this)
  }

  parity (block) {
    let blockSize = _blockSize.get(this)
    return Block.parityBlock(this, block, blockSize)
  }

  static parityBlock (blockA, blockB, blockSize) {
    if ((!blockA instanceof Block) || (!blockB instanceof Block)) {
      throw new Error('Invalid Blocks')
    }
    let data = xor(blockA.data, blockB.data)
    return new Block(data, blockSize)
  }

  static randomBlock (blockSize) {
    if (!Number.isInteger(blockSize)) {
      throw new TypeError('Invalid block size')
    }
    let data = crypto.randomBytes(blockSize)
    return new Block(data, blockSize)
  }
}



