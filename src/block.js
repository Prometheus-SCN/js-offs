'use strict'
const util = require('./utility')
const crypto = require('crypto')
const xor = require('buffer-xor')
const bs58 = require('bs58')

let _data = new WeakMap()
let _key = new WeakMap()
const _blockSize = 128000

function zeroPad (buf) {
  var zeroes = new Buffer(_blockSize - buf.length);
  zeroes.fill(0);
  return Buffer.concat([ buf, zeroes ])
}
module.exports = class Block {
  constructor (data) {
    if (!data) {
      throw new Error('Block must be constructed with data')
    }

    if (Buffer.isBuffer(data)) {
      _data.set(this, data)
    } else {
      data = new Buffer(data)
      if (Buffer.length > _blockSize) {
        throw new Error('Invalid Block Size: Block exceeds 128kb')
      }
      if (Bufer.length < _blockSize) {
        data = zeroPad(data)
      }
      _data.set(this, data)
    }
  }

  get data () {
    return _data.get(this)
  }

  get key () {
    let key = _key.get(this)
    if (key) {
      return key
    } else {
      key = bs58.encode(util.hash(this.data))
      _key.set(this, key)
      return key
    }
    return _key.get(this)
  }

  parity (block) {
    Block.parityBlock(this, block)
  }

  static parityBlock (blockA, blockB) {
    if ((!blockA instanceof Block) || (!blockB instanceof Block)) {
      throw new Error('Invalid Blocks')
    }
    let data = xor(blockA.data, blockB.data)
    return new Block(data)
  }

  static randomBlock () {
    let data = crypto.randomBytes(_blockSize)
    return new Block(data)
  }
}



