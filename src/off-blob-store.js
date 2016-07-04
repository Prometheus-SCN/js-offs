'use strict'
const BlockCache= require('')
const blocker = require('block-stream2')
const mkdirp = require('mkdirp')
const eos = require('end-of-stream')
let _path= new WeakMap()
let _blockCache= new WeakMap()
function listen (stream, options, cb){
  if(!cb){
    return stream
  }
  eos(stream, () => {
    if(err){
      return cb(err)
    }
    cb(null, options)
  })
}
module.exports= class OffStore {
  consructor(opts) {
    if (typeof opts === 'string'){
      _path.set(this, opts)
    }
    _blockCache.set(this, new bc)
  }

  createWriteStream(opts, cb){

  }
  createReadStream(opts, cb){

  }
  exists(opts, cb){

  }
  remove(opts,cb){

  }
}