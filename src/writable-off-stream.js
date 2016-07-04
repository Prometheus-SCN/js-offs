'use strict'
const blocker = require('block-stream2')
const Writable = require('readable-stream').Writable;
const BlockCache= require('./block-cache')
const Block = require('./block')
const through= require('through2')
const isStream= require('isstream')
const streamifier = require('streamifier')
const _tupleSize= 3
const _blockSize = 128000
let _path= new WeakMap()
let _blockCache= new WeakMap()
let _last = new WeakMap()
module.exports= class WritableOffStream extends Writable {
  constructor(opts){
    if(!opts){
      throw new Error('Invalid Options')
    }
    if(typeof opts === 'string') {
      opts = { path: opts }
    }
    if(opts.path){
      _path.set(this, opts)
    } else {
      throw new Error('Invalid Path')
    }
    opts.highWaterMark = _blockSize
    super(opts)
    _blockCache.set(this, new BlockCache(opts.path))
  }
  get path (){
    return _path.get(this)
  }
  _write(buf, enc, next){
    let bufStream
    if(Buffer.isBuffer(buf)){
      bufStream = streamifier.createReadStream(buf)
    }
    if(!isStream.isReadable(bufStream)){
      this.emit('error', new Error('Invalid Input'))
      return
    }
    bufStream.pipe(blocker({size:_blockSize, zeroPadding: false}))
    .pipe(through((buf, enc, next)=>{
      let bc = _blockCache.get(this)
      let block = new Block(buf)
      bc.put(block,(err)=>{
        if(err){
          this.emit('error', err)
        }

      })
    }))
  }

}