'use strict'
let _hashPadding= 34
let _accumulator = new WeakMap()
module.exports = class HashMap{
  constructor(){
    _accumulator.set(this, new Buffer(0))
  }
  accumulate(buf){

  }
}
