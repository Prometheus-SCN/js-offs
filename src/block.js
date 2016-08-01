'use strict'
const util = require('./utility')
const crypto = require('crypto')
const xor = require('buffer-xor')
const bs58 = require('bs58')
const config= require('../config')

let _data = new WeakMap()
let _key = new WeakMap()
let _hash = new WeakMap()
const _blockSize = config.blockSize

function randomPad (buf) {
  let random = crypto.randomBytes(_blockSize - buf.length)
  return Buffer.concat([ buf, random ])
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
    }
    if (data.length > _blockSize) { //TODO: make test cases for all exceptions
      throw new Error('Invalid Block Size: Block exceeds 128kb')
    }
    if (data.length < _blockSize) {
      data = randomPad(data)
    }
    _data.set(this, data)

  }

  get data () {
    return _data.get(this).slice(0)
  }
  get hash(){
    let hash= _hash.get(this)
    if(hash){
      return hash.slice(0)
    } else{
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
    return Block.parityBlock(this, block)
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



