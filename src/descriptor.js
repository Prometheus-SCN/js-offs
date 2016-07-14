'use strict'
const Block = require('./block')
let _data = new WeakMap()
const _descriptorPad = 46
const _blockSize = 128000
let _blockArr =[]
module.exports = class Descriptor {
  constructor () {
    _data.set(this, [ new Buffer(0) ])
  }
  //once blocks have been created the descriptor is sealed
  get sealed(){
    return (_blockArr.length != 0)
  }

  //variadic function and it does expect input
  tuple () {
    if(_blockArr.length == 0) {
      if (arguments.length === 0) {
        throw new Error('Invalid Tuple')
      }
      if ((arguments.length === 1) && (!Array.isArray(arguments[0]))) {
        throw new Error('Invalid Tuple')
      }
      let args
      if (arguments.length === 1) {
        args= arguments[0]
      } else{
        args= [...arguments]
      }

      let dblocks = _data.get(this) // descriptor blocks
      let data = dblocks[ dblocks.length - 1 ] //data of current descriptor
      let tupBuf = new Buffer(0)
      for (let i = 0; i < args.length; i++) {
        let block = args[ i ]
        if (!(block instanceof Block)) {
          throw new Error("Invalid Block In Tuple")
        }
        tupBuf = Buffer.concat([ tupBuf, new Buffer(block.key) ])
      }
      //
      if ((data.length + tupBuf.length) <= (_blockSize - _descriptorPad )) { 

        data = Buffer.concat([ data, tupBuf ])
        dblocks[ dblocks.length - 1 ] = data
        _data.set(this, dblocks)
      } else {
        data = tupBuf
        dblocks[ dblocks.length ] = data
        _data.set(this, dblocks)
      }

    } else {
      throw new Error("Descriptor has been sealed")
    }
  }

  blocks () {
    if(_blockArr.length == 0) {
      let dblocks = _data.get(this)
      if (dblocks.length === 1) {
        _blockArr = [ new Block(dblocks[ 0 ]) ]
        return _blockArr
      } else {
        let last
        for (let i = (dblocks.length - 1); i >= 0; i--) {
          let data = dblocks[ i ]
          if (last) {
            data = Buffer.concat([ data, last ])
            dblocks[ i ] = data
          }
          let block = new Block(data)
          _blockArr.unshift(block)
          last = new Buffer(block.key)
        }
        _data.set(this, dblocks)
        return _blockArr
      }
    } else{
      return _blockArr
    }
  }
}